import { BaseDataSourceOptions } from 'typeorm/data-source/BaseDataSourceOptions'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type NoSafe = any
export interface DmConnectionOptions extends Omit<BaseDataSourceOptions, 'type'> {
  /**
   * Database type.
   */
  readonly type: 'dm'
  /**
   * 是否开启空间插件
   */
  dmgeo?: boolean
  /**
   * 数据库地址
   */
  host: string
  /**
   * 数据库端口
   */
  port: number
  /**
   * 用户名
   */
  username: string
  /**
   * 密码
   */
  password: string
  /**
   * 指定用户登录后的当前模式，默认为用户的默认模式
   */
  schema: string
  /**
   * 最大连接数，默认4，可选
   */
  poolMax?: number
  /**
   * 最小连接数，默认0，可选
   */
  poolMin?: number
  /**
   * 连接闲置多久后自动关闭，单位秒，默认60，0代表永不关闭闲置连接，可选，
   */
  poolTimeout?: number
  /**
   * 链接池别名
   */
  poolAlias?: string
  /**
   * 连接获取前是否验证有效性
   *
   * @default false
   */
  testOnBorrow?: boolean
  /**
   * 连接有效性检查使用的SQL语句，必须至少有一行结果集
   *
   * @defalut 'select 1;'
   */
  validationQuery?: string
  /**
   * 	地址重定向，格式：(IP_1:PORT_1,IP_2:PORT_2)，如：addressRemap=(192.168.0.1:5236,localhost:5237)，
   *  如果连接192.168.0.1:5236，则实际连接到localhost:5237。可以配置多个地址重定向，
   *  如：addressRemap=(localhost:5236,localhost:5237)(localhost:5238,localhost:5239)，默认空
   */
  ddressRemap?: string
  /**
   * 在自动提交开关打开时，是否允许手动提交回滚，默认true
   */
  alwaysAllowCommit?: boolean
  /**
   * 	客户端应用程序名称，默认空
   */
  appName?: string
  /**
   * continueBatchOnError开启时，最大可容错行数，超过则停止执行
   * ，但不报错，有效值范围0~65535，默认0，表示无限制
   */
  batchAllowMaxErrors?: number
  /**
   * 存储过程是否不批量执行，默认false，取值（true，false）
   */
  batchNotOnCall?: boolean
  /**
   * 批处理类型，默认1，取值（1：进行批量绑定；2：不进行批量绑定）
   */
  batchType?: number
  /**
   * 结果集fetch预取消息buffer大小；单位KB，有效值范围32~65535。默认0，表示按服务器配置。
   */
  bufPrefetch?: number
  /**
   * 	当doSwitch = 2，epSelector = 1时，用于检测DSC集群节点故障恢复是否成功，默认空，取值（DSC）
   */
  cluster?: string
  /**
   * 批量执行出错时是否继续执行；默认false
   */
  continueBatchOnError?: boolean
  /**
   * 列名是否全部大写，默认false，取值（true，false）
   */
  columnNameUpperCase?: boolean
  /**
   * 列名大小写显示策略，默认空，取值（upper，lower）
   */
  columnNameCase?: string
  /**
   * 兼容其他数据库, 属性值为数据库名称（例如：oracle），支持兼容oracle和mysql
   */
  compatibleMode?: string
  /**
   * 是否压缩消息。0：不压缩；1：完全压缩；2：优化的压缩；默认0
   */
  compress?: number
  /**
   * 压缩算法。0：ZLIB压缩；1：SNAPPY压缩；默认0
   */
  compressId?: number
  /**
   * 连接数据库超时时间，单位ms，取值范围：0~2147483647，默认5000
   */
  connectTimeout?: number
  /**
   * 连接发生异常或一些特殊场景下的连接处理策略。0：关闭连接；1：当连接发生异常时自动切换到其他库，
   * 无论切换成功还是失败都会报错，用于通知上层应用进行事务执行失败时的相关处理；2：配合epSelector = 1使用，
   * 如果服务名列表前面的节点恢复了，将当前连接切换到前面的节点上；默认0
   */
  doSwitch?: number
  /**
   * 是否开启结果集缓存；默认false；取值（true，false）
   */
  enRsCache?: boolean
  /**
   * 服务名连接策略。0：依次选取列表中的不同节点建立连接，使得所有连接均匀地分布在各个节点上；
   * 1：选择列表中最前面的节点建立连接，只有当前节点无法建立连接时才会选择下一个节点进行连接；默认0
   */
  epSelector?: number
  /**
   * 是否进行语法转义处理，默认false；取值（true，false）
   */
  escapeProcess?: boolean
  /**
   * 是否使用列模式结果集，默认false；取值（true，false）
   */
  isBdtaRS?: boolean
  /**
   * Lob模式，默认1；取值（1 分批缓存到本地, 2 一次将大字段数据缓存到本地）
   */
  lobMode?: number
  /**
   * 客户端本地时区，单位min，取值范围 - 720~720
   */
  localTimezone?: number
  /**
   * 日志等其他一些驱动过程文件生成目录，默认值是当前工作目录
   */
  logDir?: string
  /**
   * 	日志刷盘频率，单位s，取值范围：0~2147483647，默认10
   */
  logFlushFreq?: number
  /**
   * 该参数用于指定dmkey工具生成的公钥文件路径，非加密通信的情况下，可对登录用户名密码进行增强加密；
   */
  loginCertificate?: string
  /**
   * 服务名连接数据库时是否只选择dsc control节点的库，默认false，取值（true，false）
   */
  loginDscCtrl?: boolean
  /**
   * 是否进行通信加密，默认true；取值（true / True，false / False）
   */
  loginEncrypt?: number
  /**
   * 指定优先登录的服务器模式。0：优先连接PRIMARY模式的库，NORMAL模式次之，最后选择STANTBY模式；
   * 1：只连接主库；2：只连接备库；3：优先连接STANDBY模式的库，PRIMARY模式次之，最后选择NORMAL模式；
   * 4：优先连接NORMAL模式的库，PRIMARY模式次之，最后选择STANDBY模式；默认4；
   */
  loginMode?: number
  /**
   * 服务名方式连接数据库时只选择状态匹配的库； 0表示不限制；3表示mount状态；4 表示open状态；5 表示suspend状态；默认0；
   */
  loginStatus?: number
  /**
   * 生成日志的级别，日志按从低到高依次如下（off：不记录；error：只记录错误日志；warn：记录警告信息；
   * sql：记录sql执行信息；info：记录全部执行信息；all：记录全部），默认off，高级别同时记录低级别的信息
   */
  logLevel?: string
  /**
   * 	结果集行数限制，若超过上限，则对结果集进行截断，取值范围：0~2147483647，默认0，表示无限制
   */
  maxRows?: number
  /**
   * 是否MPP本地连接，默认false；取值（true，false）
   */
  mppLocal?: boolean
  /**
   * 操作系统名称，默认空
   */
  osName?: string
  /**
   * 结果集缓存区大小，单位MB，默认20，范围1~65536
   */
  rsCacheSize?: number
  /**
   * 结果集缓存检查更新的频率，单位秒，默认10，范围0~10000；如果设置为0，则不需检查更新；
   */
  rsRefreshFreq?: number
  /**
   * 是否开启读写分离系统高可用；取值1 / 0 或 true / false；默认false；
   */
  rwHA?: boolean
  /**
   * 读写分离是否忽略sql类型，并按比例分发到主 / 备库，默认false，取值（true，false）
   */
  rwIgnoreSql?: boolean
  /**
   * 分发到主库的事务占主备库总事务的百分比，有效值0~100，默认25
   */
  rwPercent?: number
  /**
   * 是否使用读写分离系统，默认false；取值（false不使用，true使用）
   */
  rwSeparate?: boolean
  /**
   * 读写分离系统备库故障恢复检测频率，单位ms，取值范围：0~2147483647，默认1000；0表示不恢复
   */
  rwStandbyRecoverTime?: number
  /**
   * 会话超时时间，单位s，取值范围：0~2147483647，默认0
   */
  sessionTimeout?: number
  /**
   * 网络通讯超时时间，单位ms。取值范围0~2147483647，默认0。0表示无超时限制。如果配置了该参数，将导致执行耗时大于超时时间的数据库操作报错
   */
  socketTimeout?: number
  /**
   * 语句句柄池大小，取值范围：0~2147483647，默认15
   */
  stmtPoolSize?: number
  /**
   * 指定ssl加密证书文件、密钥文件、CA证书文件的目录，目录内必须包含client - cert.pem、client - key.pem、ca - cert.pem
   */
  sslPath?: string
  /**
   * 	自定义客户端配置文件(dm_svc.conf)的完整路径
   */
  svcConfPath?: number
  /**
   * 服务名连接数据库时，若遍历了服务名中所有库列表都未找到符合条件的库成功建立连接，等待一定时间再继续下一次遍历；
   * 单位ms，取值范围：0~2147483647，默认1000
   */
  switchInterval?: number
  /**
   * 服务名连接数据库时，若未找到符合条件的库成功建立连接，将尝试遍历服务名中库列表的次数，取值范围：0~2147483647，默认1
   */
  switchTimes?: number
  /**
   * 用户名重定向，格式：(USER1, USER2)，如：userRemap = (USER1, USER2)，如果使用USER1用户连接，
   * 则实际连接用户为USER2。可以配置多个重定向，如：userRemap = (USER1, USER2)(USER3, USER4)，默认空
   */
  userRemap?: string
}
