import { DataBaseModule } from '@admin-api/database'
import { Module, DynamicModule } from '@nestjs/common'
import { DocumentsController } from './documents.controller'
import { DocumentsRepository } from './documents.repository'
import { DocumentsService } from './documents.service'
import { FileAsyncOptions, FileOption, FILE_OPTION, NoSafe } from './type'
import { factoryToOptions } from './util'

@Module({})
export class DocumentsModule {
  static forRoot(option?: FileOption): DynamicModule {
    const providers = [
      {
        provide: FILE_OPTION,
        useValue: option || {}
      },
      DocumentsService
    ] as NoSafe[]
    const module = DataBaseModule.forFeature([DocumentsRepository], {
      name: option?.name,
      global: true,
      educe: true
    })
    return {
      module: DocumentsModule,
      global: true,
      imports: [module],
      controllers: [DocumentsController],
      providers: [...providers],
      exports: [...providers]
    }
  }

  static forRootAsync = (option: FileAsyncOptions) => {
    const options = (factoryToOptions(option as Required<FileAsyncOptions>) || {}) as FileOption
    return DocumentsModule.forRoot(options)
  }
}
