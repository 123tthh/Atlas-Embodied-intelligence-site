'use client';
import {createContext,useContext,useEffect,useState} from 'react';
import translations from '../../lib/translations.json';

export type Language = 'zh' | 'en';
const dictionary=translations as Record<string,string>;
type Translator=(text:string,...values:(string|number)[])=>string;
const format=(text:string,values:(string|number)[])=>text.replace(/\{(\d+)\}/g,(_,i)=>String(values[Number(i)]??`{${i}}`));
export function translate(lang:Language,text:string,...values:(string|number)[]){return format(lang==='en'?(dictionary[text]??text):text,values);}
const LanguageContext=createContext<{lang:Language;t:Translator;bi:(zh:string,en:string)=>string;setLanguage:(language:Language)=>void}>({lang:'zh',t:(s,...v)=>format(s,v),bi:zh=>zh,setLanguage:()=>{}});
export function LanguageProvider({children}:{children:React.ReactNode}){
  const [lang,setLang]=useState<Language>('zh');
  useEffect(()=>{const requested=new URLSearchParams(location.search).get('lang');let saved:string|null=null;try{saved=localStorage.getItem('atlas-language');}catch{}setLang(requested==='en'||requested==='zh'?requested:saved==='en'?'en':'zh');},[]);
  useEffect(()=>{document.documentElement.lang=lang==='zh'?'zh-CN':'en';},[lang]);
  function setLanguage(language:Language){setLang(language);try{localStorage.setItem('atlas-language',language);}catch{}const url=new URL(location.href);url.searchParams.set('lang',language);history.replaceState({},'',url);}
  return <LanguageContext.Provider value={{lang,t:(text,...values)=>translate(lang,text,...values),bi:(zh,en)=>lang==='zh'?zh:en,setLanguage}}>{children}</LanguageContext.Provider>;
}
export function useI18n(){return useContext(LanguageContext);}
export function LanguageSwitcher(){const {lang,setLanguage}=useI18n();return <div className="language-switch" role="group" aria-label={lang==='zh'?'界面语言':'Interface language'}><button lang="zh-CN" aria-pressed={lang==='zh'} onClick={()=>setLanguage('zh')}>中</button><button lang="en" aria-pressed={lang==='en'} onClick={()=>setLanguage('en')}>EN</button></div>;}
