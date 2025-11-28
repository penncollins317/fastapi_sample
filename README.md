# fastapi_sample
FastApi项目示例代码

## 创建迁移脚本
```shell
alembic revision --autogenerate -m "数据库修改"
```
## 迁移更新
```shell
alembic upgrade head
```

## 回滚
```shell
alembic downgrade -1
```