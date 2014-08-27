
all: build

build: check_type.sql

check_type.sql: check_type.js
	node -e 'console.log(require("./check_type.js")());' > check_type.sql

clean:
	rm check_type.sql
