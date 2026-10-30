// Strict bounds keep slow CI useful without masking stalled XR sessions.
export function parseHarnessOptions(env={}){
  const integer=(name,defaultValue,min,max)=>{
    const raw=env[name];
    if(raw===undefined||raw==='')return defaultValue;
    if(!/^[0-9]+$/.test(String(raw)))throw Error(name+' must be a whole number');
    const value=Number(raw);
    if(!Number.isSafeInteger(value)||value<min||value>max)
      throw Error(name+' must be between '+min+' and '+max);
    return value;
  };
  const mode=env.KLINIKLAB_XR_GRAPHICS||'default';
  if(!['default','software'].includes(mode))throw Error('KLINIKLAB_XR_GRAPHICS must be default or software');
  return {
    collectionDeadlineMs:integer('KLINIKLAB_XR_DEADLINE_MS',45000,15000,120000),
    performanceThresholdMs:integer('KLINIKLAB_XR_PERF_THRESHOLD_MS',20,5,1000),
    graphicsMode:mode
  };
}
export function chromeArgs(config){
  const common=['--ignore-gpu-blocklist','--enable-webgl','--disable-renderer-backgrounding','--disable-background-timer-throttling'];
  return config.graphicsMode==='software'
    ?[...common,'--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']
    :common;
}
