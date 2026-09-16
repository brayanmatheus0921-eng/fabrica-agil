"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function notifyCompanyDataChanged(){
  window.dispatchEvent(new Event("company-data-changed"));
  if(typeof BroadcastChannel!=="undefined"){
    const channel=new BroadcastChannel("company-data");
    channel.postMessage("changed");channel.close();
  }
}

export function CompanyDataSync(){
  const router=useRouter();
  useEffect(()=>{
    let last:string|undefined,running=false,disposed=false;
    const controller=new AbortController();
    const refresh=()=>{if(!disposed&&document.visibilityState==="visible")router.refresh();};
    const check=async()=>{
      if(running||document.visibilityState!=="visible")return;
      running=true;
      try{
        const response=await fetch("/api/company/revision",{cache:"no-store",signal:controller.signal});
        if(!response.ok)return;
        const {revision}=await response.json();
        if(!disposed&&last!==undefined&&revision!==last)window.dispatchEvent(new Event("company-data-changed"));
        last=revision;
      }catch{/* Next visible check retries without disrupting the current form. */}
      finally{running=false;}
    };
    const channel=typeof BroadcastChannel!=="undefined"?new BroadcastChannel("company-data"):null;
    if(channel)channel.onmessage=()=>{refresh();void check();};
    window.addEventListener("company-data-changed",refresh);
    document.addEventListener("visibilitychange",check);
    const interval=setInterval(check,5000);void check();
    return()=>{disposed=true;controller.abort();clearInterval(interval);channel?.close();window.removeEventListener("company-data-changed",refresh);document.removeEventListener("visibilitychange",check);};
  },[router]);
  return null;
}
