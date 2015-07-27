update :
	npm install
	cp node_modules/mocha/mocha.js spec/lib/
	curl https://raw.github.com/visionmedia/mocha/master/mocha.css > spec/lib/browser/mocha.css

zipit : update
	rm -f mocha-in-browser.zip
	rm -fr node_modules
	zip -r mocha-in-browser.zip public/ spec/

