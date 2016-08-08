ESLINT=./node_modules/.bin/eslint
WEBPACK=./node_modules/.bin/webpack --progress --colors

# ------------------------------------------------------------------------------

build:
	$(WEBPACK)

watch:
	$(WEBPACK) --watch --watch-poll

# ------------------------------------------------------------------------------

lint:
	$(ESLINT) ./playground/*.js
	$(ESLINT) ./src/*.js
	$(ESLINT) ./src/**/*.js

test:
	@make lint

# ------------------------------------------------------------------------------

.PHONY: build watch lint test
