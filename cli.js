#! /usr/bin/env node
var {argv} = process, args = {}, params = {'i': 'inputDir', 'o': 'outputDir', 'e': 'extensions', 'f': 'fragile'}, paramNames = Object.keys(params);




require('fs').readFile('jekt.json', 'utf-8', (err, bod) => {
  if(bod) {
    //console.log("Conf found!",bod)
    var fileConfig = JSON.parse(bod);
    if(fileConfig.directories) {
      args.i = fileConfig.directories.input || args.i;
      args.o = fileConfig.directories.output || args.o;
      args.t = fileConfig.directories.temp || args.t;
    }
    args.fragile = !!fileConfig.fragile;
  }
})

if(argv[2]&&argv[2].match(/^-?v$/)) {
	console.log('Jekt ' + JSON.parse(require('fs').readFileSync('package.json')).version)
	process.exit()
}
for(var i = 2; i < argv.length - 1; i += 2) {
  if(paramNames.includes(argv[i])) args[params[argv[i]]] = argv[i+1];
}
if(params.extensions)params.extensions = params.extensions.split(',')
require('./index.js')(args)
