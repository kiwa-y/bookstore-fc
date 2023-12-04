# bookstore-fc

[『実践プロパティベーステスト -PropErとErlang/Elixirではじめよう-』](https://www.lambdanote.com/products/proper)の10章、書籍の貸出システムをfast-checkに置き換えたサンプルです。

## How to use

データベースのユーザ名として環境変数USERNAMEを使います。必要に応じて設定してください。

```bash
# Install modules
$ npm install

# Startup database
$ docker compose up -d

# Migrate database
$ npm run migrate-db

# Run tests
$ npm test
```
