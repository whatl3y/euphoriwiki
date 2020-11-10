docker-compose -f docker-compose.test.yml up -d mongo-test

docker-compose -f docker-compose.test.yml run --rm web npm test

docker-compose -f docker-compose.test.yml stop