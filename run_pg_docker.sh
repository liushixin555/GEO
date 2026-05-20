sudo docker run -d --name pg -e POSTGRES_PASSWORD=postgres -p 5432:5432 -v d:daocker/postgres/data:/var/lib/postgresql/data -v d:daocker/postgres/logs:/var/log/postgresql postgres:16
