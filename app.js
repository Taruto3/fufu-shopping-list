import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signInWithRedirect, signOut } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { addDoc, collection, deleteDoc, doc, getFirestore, onSnapshot, orderBy, query, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const $=selector=>document.querySelector(selector);
const views=["#setupView","#loginView","#listView"];
let auth,db,unsubscribe;

function showView(selector){views.forEach(id=>$(id).classList.toggle("hidden",id!==selector))}
function toast(message){
  const el=$("#toast");el.textContent=message;el.classList.remove("hidden");
  clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.add("hidden"),1800);
}
function isConfigured(){return firebaseConfig.apiKey&&!firebaseConfig.apiKey.startsWith("YOUR_")}
function escapeText(value){const span=document.createElement("span");span.textContent=value;return span.innerHTML}

if(!isConfigured()){
  showView("#setupView");
}else{
  const app=initializeApp(firebaseConfig);
  auth=getAuth(app);db=getFirestore(app);
  onAuthStateChanged(auth,user=>user?openList(user):showLogin());
}

function showLogin(){
  if(unsubscribe){unsubscribe();unsubscribe=null}
  $("#accountBtn").classList.add("hidden");$("#accountMenu").classList.add("hidden");
  showView("#loginView");
}

function openList(user){
  showView("#listView");
  $("#accountBtn").classList.remove("hidden");
  $("#userPhoto").src=user.photoURL||"";
  $("#userPhoto").alt=user.displayName||"ログイン中";
  $("#userName").textContent=user.displayName||"";
  $("#userEmail").textContent=user.email||"";
  subscribeToList();
}

function subscribeToList(){
  if(unsubscribe)unsubscribe();
  const itemsQuery=query(collection(db,"shoppingLists","family","items"),orderBy("createdAt","asc"));
  unsubscribe=onSnapshot(itemsQuery,snapshot=>{
    $("#loadingView").classList.add("hidden");
    $("#shoppingList").innerHTML="";
    snapshot.docs.forEach(itemDoc=>{
      const item=itemDoc.data();
      const li=document.createElement("li");li.className="shopping-item";
      li.innerHTML=`<p>${escapeText(item.name)}<small>${escapeText(item.createdByName||"")}</small></p><button class="done-btn" type="button" aria-label="${escapeText(item.name)}を購入済みにする">✓</button>`;
      li.querySelector("button").onclick=async()=>{
        li.style.opacity=".45";
        try{await deleteDoc(doc(db,"shoppingLists","family","items",itemDoc.id));toast("買いました！")}
        catch(error){li.style.opacity="1";showError(error)}
      };
      $("#shoppingList").appendChild(li);
    });
    $("#itemCount").textContent=`${snapshot.size}個`;
    $("#emptyView").classList.toggle("hidden",snapshot.size!==0);
  },showError);
}

$("#loginBtn").onclick=async()=>{
  const provider=new GoogleAuthProvider();
  try{await signInWithPopup(auth,provider)}
  catch(error){
    if(["auth/popup-blocked","auth/cancelled-popup-request","auth/operation-not-supported-in-this-environment"].includes(error.code)){
      await signInWithRedirect(auth,provider);
    }else showError(error);
  }
};

$("#addForm").onsubmit=async event=>{
  event.preventDefault();
  const input=$("#itemInput"),name=input.value.trim();
  if(!name)return;
  const button=event.currentTarget.querySelector("button");button.disabled=true;
  try{
    await addDoc(collection(db,"shoppingLists","family","items"),{
      name,createdAt:serverTimestamp(),createdBy:auth.currentUser.uid,
      createdByName:auth.currentUser.displayName||""
    });
    input.value="";input.focus();toast("リストに追加しました");
  }catch(error){showError(error)}
  finally{button.disabled=false}
};

$("#accountBtn").onclick=()=>$("#accountMenu").classList.toggle("hidden");
$("#logoutBtn").onclick=()=>signOut(auth);
document.addEventListener("click",event=>{
  if(!event.target.closest("#accountBtn")&&!event.target.closest("#accountMenu"))$("#accountMenu").classList.add("hidden");
});

function showError(error){
  console.error(error);
  const messages={
    "permission-denied":"このアカウントには利用権限がありません",
    "auth/unauthorized-domain":"FirebaseにこのURLのドメインを登録してください"
  };
  toast(messages[error.code]||messages[error.message]||"通信に失敗しました。もう一度お試しください");
}
