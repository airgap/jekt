#! /usr/bin/env node
var {argv} = process, args = {}, params = {'i': 'inputDir', 'o': 'outputDir', 'e': 'extensions', 'f': 'fragile'}, paramNames = Object.keys(params);
for(var i = 2; i < argv.length - 1; i += 2) {
  if(paramNames.includes(argv[i])) args[params[argv[i]]] = argv[i+1];
}
if(params.extensions)params.extensions = params.extensions.split(',')
require('./index.js')(args)
