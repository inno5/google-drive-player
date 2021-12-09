#!/bin/sh
# .envファイルをコピーします

ENV=$1

if [ -z $ENV ]; then
	echo "env:none(local)"
	SRC_FILE=env.local.ts
elif [ ${ENV} = "local" ]; then
	echo "env:local"
	SRC_FILE=env.local.ts
elif [ ${ENV} = "dev" ]; then
	echo "env:dev"
	SRC_FILE=env.dev.ts
elif [ ${ENV} = "stg" ]; then
	echo "env:stg"
	SRC_FILE=env.stg.ts
elif [ ${ENV} = "prod" ]; then
	echo "env:prod"
	SRC_FILE=env.prod.ts
else
	echo "env:none(local)"
	SRC_FILE=env.local.ts
fi

cp ./env/${SRC_FILE} ./src/env/env.ts




