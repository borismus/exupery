label=$1

bq query --format json \
  --max_rows 1000 \
  "select * from [gweb-pictionary:quickdraw_rounds.rounds] WHERE w == '$label' LIMIT 100"
