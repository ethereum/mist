TESTS = test/*.js
TIMEOUT = 5000
REPORTER = spec
MOCHAOPTS=

install:
	@npm install --registry=http://registry.cnpmjs.org --cache=${HOME}/.npm/.cache/cnpm

build:
	@node-gyp clean configure build

test:
	@NODE_ENV=test ./node_modules/mocha/bin/mocha \
		--reporter $(REPORTER) --timeout $(TIMEOUT) $(MOCHAOPTS) $(TESTS)

contributors:
	@./node_modules/contributors/bin/contributors -f plain -o AUTHORS

.PHONY: build test
