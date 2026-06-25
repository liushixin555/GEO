sudo docker run -d --name pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=geo_ts -p 5432:5432 -v /data/postgres/data:/var/lib/postgresql/data -v /data/postgres/logs:/var/log/postgresql postgres:16
