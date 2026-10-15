/* Original local records remain untouched for migration and recovery. */
(function(){
 let uid=null,muted=false;const values=new Map();
 window.prospStorage={
  getItem(key){return values.has(key)?values.get(key):null},
  setItem(key,value){values.set(key,String(value));if(uid){localStorage.setItem('arzn-prosp-cache:'+uid+':'+key,String(value));if(!muted)window.cloudSync?.changed()}},
  removeItem(key){values.delete(key);if(uid){localStorage.removeItem('arzn-prosp-cache:'+uid+':'+key);if(!muted)window.cloudSync?.changed()}},
  load(userId,data){uid=userId;muted=true;values.clear();for(const [k,v]of Object.entries(data))if(v!==undefined&&v!==null)this.setItem(k,v);muted=false},
  original(){const data={};for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k?.startsWith('prosp_'))data[k]=localStorage.getItem(k)}return data},
  cached(userId){const data={},prefix='arzn-prosp-cache:'+userId+':';for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k?.startsWith(prefix))data[k.slice(prefix.length)]=localStorage.getItem(k)}return data},
  clear(){uid=null;values.clear()}
 };
})();
