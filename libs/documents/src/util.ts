import { createHash } from 'crypto'
import { FileAsyncOptions } from './type'
export const createFileEtag = (buffer: Buffer) => {
  return createHash('md5').update(buffer).digest('hex')
}
export const getFileType = (fileName: string): string => {
  if (fileName) {
    const index = fileName.lastIndexOf('.') //取到文件名开始到最后一个点的长度
    const fileNameLength = fileName.length //取到文件名长度
    const fileFormat = fileName.substring(index + 1, fileNameLength)
    return fileFormat
  }
  return ''
}

/**
 * 将factory注入方式的转为时间value
 * 不支持嵌套注入
 *
 * @param factory
 * @returns
 */
export const factoryToOptions = (factory: Required<FileAsyncOptions>) => {
  const inject = (factory.inject || []).map(r => (typeof r === 'function' ? new r() : r))
  const options = factory.useFactory(...inject)
  return options
}
