var weave = require('..')
function chain(bundles, depth) {
  depth = ~~depth + 1;
  if(bundles.length>0) {
    var bundle = bundles.splice(0,1)[0]
    weave(bundle,err=>{
      console.log("TEST " + depth, err ? "FAIL" : "PASS", err||'');
      chain(bundles, depth);
    })
  }
}
chain([
  {inputDir: 'unwoven-1', outputDir: 'woven-1', fragile: true},
  {inputDir: 'unwoven-2', outputDir: 'woven-2'}
])
