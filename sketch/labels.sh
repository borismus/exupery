bq query --format json \
  --max_rows 1000 \
  "SELECT w FROM [gweb-pictionary:quickdraw_rounds.rounds]
GROUP BY w"
