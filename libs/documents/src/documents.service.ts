import { HttpException, Inject, Injectable, Optional } from '@nestjs/common'
import { createReadStream, createWriteStream, existsSync, unlinkSync } from 'fs'
import { Response } from 'express'
import { FileOption, FILE_OPTION, PagingData, QueryEntity, TFileOption } from './type'
import { createFileEtag, getFileType } from './util'
import { Documents } from './documents.entity'
import { join } from 'path'
import { FindManyOptions, FindOptionsWhere, Like } from 'typeorm'
import { DocumentsRepository } from './documents.repository'
@Injectable()
export class DocumentsService {
  private root = 'public'

  constructor(
    @Optional() @Inject(FILE_OPTION) private option: FileOption,
    private file: DocumentsRepository
  ) {}

  get directoty() {
    return this.option?.path || '/'
  }

  /**50 时前端每秒最大下载900多KB/S */
  get highWaterMark() {
    return this.option?.highWaterMark || 100
  }

  /**单文件上传处理 */
  async uploadFile(file: TFileOption, paths: string) {
    try {
      const etag = createFileEtag(file.buffer)
      const files = await this.file.findOneBy({ etag })
      if (!files || this.option?.noEtag) {
        const mkdir = join(this.root, this.directoty, paths || '')
        if (!existsSync(mkdir)) {
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          require('mkdirp').sync(mkdir)
        }
        const type = getFileType(decodeURIComponent(escape(file.originalname)))
        const pathSrc = join(mkdir, `${new Date().getTime()}.${type}`)
        const writeImage = createWriteStream(pathSrc)
        writeImage.write(file.buffer)
        const info = new Documents()
        info.etag = etag
        info.name = decodeURIComponent(escape(file.originalname))
        info.type = type
        info.size = file.buffer.byteLength
        info.path = pathSrc
        return this.file.save(info)
      }
      return files
    } catch (err) {
      throw new HttpException('该资源上传失败，请稍后重试！', 500)
    }
  }

  /**多文件上传处理 */
  async uploadFiles(files: TFileOption[], path: string) {
    const result: Documents[] = []
    for (let i = 0; files && i < files.length; i++) {
      result.push(await this.uploadFile(files[i], path))
    }
    return result
  }

  /**下载文件 */
  async downloadFile(id: string, res: Response) {
    const record = await this.file.findOneBy({ id })
    if (record && record.path) {
      const file = createReadStream(join(process.cwd(), record.path), {
        highWaterMark: this.highWaterMark
      })
      res.header('Connection', 'keep-alive')
      res.header('Content-Type', 'application/octet-stream')
      res.header('ETag', record.etag)
      res.header('Content-Length', `${record.size}`)
      res.header('Content-Disposition', `attachment; filename=${encodeURI(record.name)}`)
      return file.pipe(res)
    }
    throw new HttpException('该资源信息不存在！', 404)
  }

  /**文件预览 */
  async previewFile(id: string, res: Response) {
    const getContentType = (key: string) => {
      return {
        pdf: 'application/pdf',
        jpeg: 'image/jpeg',
        jpg: 'image/jpeg',
        png: 'image/jpeg',
        mp4: 'video/mp4'
      }[key]
    }
    const record = await this.file.findOneBy({ id })
    if (record && record.path) {
      const file = createReadStream(join(process.cwd(), record.path))
      res.header('Content-Type', getContentType(record.type))
      // res.header('Cache-Control', 'max-age=1000*60*60*24');
      return file.pipe(res)
    }
    throw new HttpException('该资源信息不存在！', 404)
  }

  async getMany(query: QueryEntity<Documents>): Promise<PagingData<Documents>> {
    const { pi, ps, name, type } = query || {}
    const findCondition = {} as FindManyOptions<Documents>
    const where = {} as FindOptionsWhere<Documents>
    const page = isNaN(Number(pi)) ? 1 : Number(pi)
    const limit = isNaN(Number(ps)) ? 0 : Number(ps)
    if (limit > 0) {
      findCondition.skip = Math.abs(page - 1) * limit
      findCondition.take = limit
    }
    if (name && name.trim()) {
      where.name = Like(`%${name.trim()}%`)
    }
    if (type) {
      where.type = type
    }
    if (Object.keys(where).length) {
      findCondition.where = where
    }
    const [data, count] = await this.file.findAndCount(findCondition)
    return {
      data,
      count,
      page,
      limit
    }
  }

  async getOne(id: string) {
    return this.file.findOneBy({ id })
  }

  async deleteData(id: string | string[]) {
    if (this.option?.noEtag && !Array.isArray(id)) {
      const { path } = (await this.file.findOneBy({ id })) || {}
      if (existsSync(path)) {
        unlinkSync(path)
      }
    }
    return this.file.delete(id)
  }
}
