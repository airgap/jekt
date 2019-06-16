var fs = require('fs'),
    mkdirp = require('mkdirp'),
    pather = require('path');

function jekt(params, callback) {
  var DIRECTORIES = [];
  var FILES = []
  var DEPENDENCIES = {};
  var UNMET_DEPENDENCIES = {};
  var WRITTEN_FILES = {};
  var ACTIVE_READS = 0;

  var DEPENDENCY_COUNT = 0;
  var INTERPOLATED_COUNT = 0;
  var WRITTEN_FILE_COUNT = 0;

  var ARGREG = /^[\-\/](.+)$/;
  var ATREG = /(?:^|[^\\])(?:\\\\)*@@(.+?)(?:(?:\\\\)*@@|$)/gm;
  var CONF = {
      e: ['html', 'js', 'css'],
      i: 'unwoven-site',
      o: 'woven-site',
      fragile: false
  };
  var CALLBACK;
  if(typeof callback === 'function') CALLBACK = callback;
  if(typeof params == 'object') {
    var fragile = !!params.fragile
    CONF.fragile = !!fragile
    if(typeof params.inputDir == 'string') CONF.i = params.inputDir;
    if(typeof params.outputDir == 'string') CONF.o = params.outputDir;
    if(Array.isArray(params.extensions)) {
      for(var extension of params.extensions)
        if(typeof extension != 'string') {
          var err = 'Invalid extension type specified.';
          if(fragile) throw err
          else return {err:err}
        }
      CONF.e = extensions
    }
  }
  CONF.t = CONF.o;
  for(var i of ['i', 'o', 't'])CONF[i] = pather.resolve(CONF[i])
  listTree(CONF.i);
function getArgs() {
    'use strict';
    var arg, i;
    for (i = 2; i < process.argv.length - 1; i += 1) {
        arg = process.argv[i].match(ARGREG);
        if (!arg) {
            throw 'Invalid option format.';
        }
        arg = arg[1];
        if (!CONF.hasOwnProperty(arg)) {
            throw 'Invalid option provided.';
        }
        CONF[arg] = process.argv[i + 1];
    }
}
function listTree(directory) {
    'use strict';
    queueRead();
    fs.readdir(directory, (err, items) => {
        if(!Array.isArray(items)) {
            throw `Unable to read input directory ${directory}`
        }
        for(var item of items) {
          statItem(item);
        }
        unqueueRead();
    })
    function statItem(item) {
      queueRead();
      var path = pather.join(directory,item);
      fs.stat(path, (err, stats) => {
        if(stats.isDirectory()) {
          DIRECTORIES.push(path);
          listTree(path);
          unqueueRead();
        } else if(stats.isFile()) {
          fs.readFile(path, 'utf-8', processFile)
        }
      })
      function processFile(err, body) {
        var e = ATREG, m, dependencies = [];
        var ext = path.match(/\.([a-z0-9]+)$/)
        if(ext && CONF.e.includes(ext[1])) {
          //console.log("MATCH",ext)
          while(m = e.exec(body)) {
            var p = pathify(directory, m[1]);
            //var op = pathify(outify(directory), m[1]);
            var op = pather.join(CONF.t,p.substring(CONF.i.length))
            var pathObj = {
              name: m[1],
              inputPath: p,
              outputPath: op,
              inputDir: directory,
              outputDir: outify(directory)
            }
            DEPENDENCY_COUNT++;
            if(!dependencies.includes(pathObj))
              dependencies.push(pathObj)
          }
        }
        DEPENDENCIES[path]=dependencies;
        FILES.push(path);
        unqueueRead();
      }
    }
}
function queueRead() {
  ACTIVE_READS++;
}
function unqueueRead() {
  ACTIVE_READS--;
  if(!ACTIVE_READS) {
    UNMET_DEPENDENCIES = JSON.parse(JSON.stringify(DEPENDENCIES))
    /*for(k of Object.keys(UNMET_DEPENDENCIES))
      for(d in UNMET_DEPENDENCIES[k])
        UNMET_DEPENDENCIES[k][d].outed = outify(UNMET_DEPENDENCIES[k][d].path)*/
    //console.log("CONT", CONF, "DIRECTORIES", DIRECTORIES, "FILES", FILES,"DEPENDENCIES", DEPENDENCIES, "UNMET", UNMET_DEPENDENCIES);
    passDependencies();
  }
}

var filesLeftInPass;
var filesWrittenInPass;

function passDependencies() {
  filesLeftInPass = FILES.length;
  filesWrittenInPass = 0;
  for(var f of FILES) {
    readFileInPass(f);
  }
  function readFileInPass(f) {
    if(WRITTEN_FILES[f]) {
      tryAnotherPass();
      return;
    }
      //console.log("PASSING", f, DEPENDENCIES[f])
    if(!UNMET_DEPENDENCIES[f].length) {
      var fDepends = {};
      var fContents;
      var reqs = DEPENDENCIES[f].length + 1;
      fs.readFile(f, 'utf-8', (err, bod) => {
        if(err) throw 'Error reading file.'
        fContents = bod;
        tryInterpolateFile();
      })
      for(var d of DEPENDENCIES[f]) {
        readDependent(d);
      }
      function readDependent(d) {
        fs.readFile(d.outputPath, 'utf-8', (err, bod) => {
          if(err) throw 'Error reading dependent.';
          fDepends[d.outputPath] = bod;
          tryInterpolateFile();
        })
      }
      function tryInterpolateFile() {
        reqs--;
        if(!reqs) {
          interpolateFile(f, fContents);
        } else {
        }
      }

      function interpolateFile(f) {
        var reqs = DEPENDENCIES[f].length;
        for(var d of DEPENDENCIES[f]) {
          interpolateDependency(d);
        }
        if(!reqs){
          writeReplaced();
        }
        function interpolateDependency(d) {
          var fmatch=d.name;//d.substring(CONF.o.length).replace(/[\\\/]/g,'[\\\\\\\/]').replace('.','\\.')
          //console.log("INTERPOLATING", f, d);
          fs.readFile(d.outputPath,'utf-8',(err,bod) => {
            var reg = new RegExp('(^|[^\\\\])(\\\\\\\\)*@@'+fmatch+'((?:\\\\\\\\)*@@|$)','gm');
            //console.log(reg);
            fContents = fContents.replace(reg,"$1$2"+bod.replace(/\$/g,'KSFDJKDJIEJIKDJFKJEIFJKDJIEJFK')).replace(/KSFDJKDJIEJIKDJFKJEIFJKDJIEJFK/g,'$')
            //well.......it works.......
            reqs--;
            if(!reqs) {
              writeReplaced();
            } else {
            }
          })
        }
        function writeReplaced() {
          //console.log("WRITING REPLACED", fContents)
          var derp = outify(f).match(/(.+[\/\\])/)[1];//(f.match(/(.+\/)/)||[null,])[1]);
          mkdirp(derp,err=>{
            if(err) throw err;
            //console.log(fContents)
            fs.writeFile(outify(f), fContents, (err) => {
              if(err)throw err
              for(var k of Object.keys(UNMET_DEPENDENCIES)) {
                for(d in UNMET_DEPENDENCIES[k]) {
                  //console.log("UNMET K", UNMET_DEPENDENCIES[k], "UNMET D", UNMET_DEPENDENCIES[k][d], "f", f, "OUTD", outify(f))
                  if(UNMET_DEPENDENCIES[k][d].inputPath==f) {
                    //console.log("MATCHES")
                    UNMET_DEPENDENCIES[k].splice(d,1);
                    INTERPOLATED_COUNT++;
                    break;
                  }
                }
              }
              WRITTEN_FILES[f] = true;
              WRITTEN_FILE_COUNT++;
              filesWrittenInPass++;
              tryAnotherPass();
            })
          })
        }
      }
    } else {
      tryAnotherPass();
    }
  }
}
function outify(d) {
  //var out = CONF.t+(d.match(/([\/\\].+)/)||[0,"/"+d])[1]
  //out = pather.resolve(out)
  var out = d;
  if(CONF.i==d.substring(0,CONF.i.length)) out = pather.join(CONF.o,d.substring(CONF.i.length+1))
  //console.log("OUTEDY", out)
    //console.log("OUTIFY", d, CONF.i, out)
  return out
}
function pathify(directory, m) {
  //console.log('PATHING',m,m[0].match(/[\/\\]/),pather.join(CONF.t,m))
  if(m[0].match(/[\/\\]/)) return pather.join(CONF.i,m)//.substring(1);
  //console.log("STILL PATHING")
  var t;
  var path = (m.match(/(.+[\/\\])/)||[null,m])[1];
  var file = m.match(/[^\\\/]+$/)[1];
  while(path.substring(0,3)=='../') {
    path=path.substring(3);
    directory = directory.match(/(.+[\/\\])/)[1]
  }
  return pather.join(directory, m)
}

function tryAnotherPass() {
  filesLeftInPass--;
  if(filesLeftInPass==0) {
    if(filesWrittenInPass) {
      //setTimeout(passDependencies,1000)
      passDependencies();
    } else {
      var t = '';
      var failed;
      for(var k of Object.keys(UNMET_DEPENDENCIES)) {
        if(UNMET_DEPENDENCIES[k].length) {
          failed = true;
          t+=k.match(/([\/\\].+)/)[1]+":"
          for(var d of UNMET_DEPENDENCIES[k])
            t+='\n->\t'+d.name;//match(/([\/\\].+)/)[1];
          t+='\n';
        }
      }
      if(failed) {
        if(CONF.fragile) throw 'Nonexistent dependencies or loop discovered.\n'+t
        else if(typeof CALLBACK === 'function') CALLBACK({err: 'Nonexistent dependencies or loop discovered.', description: t})
      } else if(typeof CALLBACK === 'function') {//
        CALLBACK()
      }
    }
  }
}
var LAST_STATUS = null
function updateProgress(){
  var status = `\rJekts: ${INTERPOLATED_COUNT} of ${DEPENDENCY_COUNT} | Written: ${WRITTEN_FILE_COUNT} of ${FILES.length}              `;
  if(status !=LAST_STATUS) {
    LAST_STATUS = status;
    process.stdout.write(status)
  }
}
}
module.exports = jekt;
