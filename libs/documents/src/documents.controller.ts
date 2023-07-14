import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Res,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors
} from '@nestjs/common'
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express'
import { DocumentsService } from './documents.service'
import { QueryEntity, TFileOption } from './type'
import { Response } from 'express'
import { Documents } from './documents.entity'
import { WhiteAuthGuard } from '@admin-api/auth'
import { ExcludeControllerAcl } from '@admin-api/system'

@ExcludeControllerAcl()
@Controller('documents')
export class DocumentsController {
  constructor(private service: DocumentsService) {}

  @Post('/upload/one')
  @UseInterceptors(FileInterceptor('file'))
  uploadFile(@UploadedFile() file: TFileOption, @Query('path') path: string) {
    return this.service.uploadFile(file, path)
  }

  @Post('/upload/more')
  @UseInterceptors(FilesInterceptor('files'))
  uploadFiles(@UploadedFiles() files: TFileOption[], @Query('path') path: string) {
    return this.service.uploadFiles(files, path)
  }

  @UseGuards(WhiteAuthGuard)
  @Get('download/:id')
  downloadFile(@Param('id') id: string, @Res() res: Response) {
    return this.service.downloadFile(id, res)
  }

  @UseGuards(WhiteAuthGuard)
  @Get('preview/:id')
  previewFile(@Param('id') id: string, @Res() res: Response) {
    return this.service.previewFile(id, res)
  }

  @Get()
  getMany(@Query() query: QueryEntity<Documents>) {
    return this.service.getMany(query)
  }

  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.service.getOne(id)
  }

  @UseGuards(WhiteAuthGuard)
  @Delete(':id')
  deleteOne(@Param('id') id: string) {
    return this.service.deleteData(id)
  }

  @Post('delete')
  deleteMany(@Body('ids') ids: string[]) {
    return this.service.deleteData(ids)
  }
}
