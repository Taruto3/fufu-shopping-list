import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { addDoc, collection, deleteDoc, doc, getFirestore, onSnapshot, orderBy, query, serverTimestamp, writeBatch } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const $=selector=>document.querySelector(selector);
const views=["#setupView","#loginView","#listView"];
let auth,db,unsubscribeActive,unsubscribeCompleted;

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
  onAuthStateChanged(auth,user=>{
    try{user?openList(user):showLogin()}
    catch(error){showLogin();showError(error)}
  });
}

function showLogin(){
  if(unsubscribeActive){unsubscribeActive();unsubscribeActive=null}
  if(unsubscribeCompleted){unsubscribeCompleted();unsubscribeCompleted=null}
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
  subscribeToLists();
}

function subscribeToLists(){
  if(unsubscribeActive)unsubscribeActive();
  if(unsubscribeCompleted)unsubscribeCompleted();
  const itemsQuery=query(collection(db,"shoppingLists","family","items"),orderBy("createdAt","asc"));
  unsubscribeActive=onSnapshot(itemsQuery,snapshot=>{
    $("#loadingView").classList.add("hidden");
    $("#shoppingList").innerHTML="";
    snapshot.docs.forEach(itemDoc=>{
      const item=itemDoc.data();
      const li=document.createElement("li");li.className="shopping-item";
      li.innerHTML=`<p>${escapeText(item.name)}<small>${escapeText(item.createdByName||"")}</small></p><button class="done-btn" type="button" aria-label="${escapeText(item.name)}を購入済みにする">✓</button>`;
      li.querySelector("button").onclick=async()=>{
        li.style.opacity=".45";
        try{
          const batch=writeBatch(db);
          const completedRef=doc(collection(db,"shoppingLists","family","completed"));
          batch.set(completedRef,{
            name:item.name,createdAt:item.createdAt||serverTimestamp(),
            createdBy:item.createdBy||"",createdByName:item.createdByName||"",
            completedAt:serverTimestamp(),completedBy:auth.currentUser.uid,
            completedByName:auth.currentUser.displayName||""
          });
          batch.delete(doc(db,"shoppingLists","family","items",itemDoc.id));
          await batch.commit();toast("買い物済みに移しました");
        }
        catch(error){li.style.opacity="1";showError(error)}
      };
      $("#shoppingList").appendChild(li);
    });
    $("#itemCount").textContent=`${snapshot.size}個`;
    $("#activeTabCount").textContent=snapshot.size;
    $("#emptyView").classList.toggle("hidden",snapshot.size!==0);
  },showError);

  const completedQuery=query(collection(db,"shoppingLists","family","completed"),orderBy("completedAt","desc"));
  unsubscribeCompleted=onSnapshot(completedQuery,snapshot=>{
    $("#completedLoadingView").classList.add("hidden");
    $("#completedList").innerHTML="";
    snapshot.docs.forEach(itemDoc=>{
      const item=itemDoc.data();
      const date=item.completedAt&&typeof item.completedAt.toDate==="function"?item.completedAt.toDate():null;
      const dateText=date?`${date.getMonth()+1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2,"0")}`:"";
      const li=document.createElement("li");li.className="shopping-item";
      li.innerHTML=`<div class="item-main"><p>${escapeText(item.name)}</p><small>${escapeText(dateText)}　${escapeText(item.completedByName||"")}</small></div><button class="restore-btn" type="button" aria-label="${escapeText(item.name)}を買い物リストに戻す">↩</button><button class="delete-btn" type="button" aria-label="${escapeText(item.name)}の履歴を削除">×</button>`;
      li.querySelector(".restore-btn").onclick=async()=>{
        li.style.opacity=".45";
        try{
          const batch=writeBatch(db);
          const activeRef=doc(collection(db,"shoppingLists","family","items"));
          batch.set(activeRef,{
            name:item.name,createdAt:serverTimestamp(),
            createdBy:auth.currentUser.uid,createdByName:auth.currentUser.displayName||""
          });
          batch.delete(doc(db,"shoppingLists","family","completed",itemDoc.id));
          await batch.commit();toast("買い物リストに戻しました");
        }catch(error){li.style.opacity="1";showError(error)}
      };
      li.querySelector(".delete-btn").onclick=async()=>{
        li.style.opacity=".45";
        try{await deleteDoc(doc(db,"shoppingLists","family","completed",itemDoc.id));toast("履歴から削除しました")}
        catch(error){li.style.opacity="1";showError(error)}
      };
      $("#completedList").appendChild(li);
    });
    $("#completedCount").textContent=`${snapshot.size}個`;
    $("#completedTabCount").textContent=snapshot.size;
    $("#completedEmptyView").classList.toggle("hidden",snapshot.size!==0);
  },showError);
}

$("#loginBtn").onclick=async()=>{
  const provider=new GoogleAuthProvider();
  $("#loginBtn").disabled=true;
  try{
    const result=await signInWithPopup(auth,provider);
    if(result.user)openList(result.user);
  }
  catch(error){
    showError(error);
  }
  finally{$("#loginBtn").disabled=false}
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
document.querySelectorAll("[data-tab]").forEach(button=>button.onclick=()=>{
  const completed=button.dataset.tab==="completed";
  document.querySelectorAll("[data-tab]").forEach(tab=>tab.classList.toggle("active",tab===button));
  $("#activePanel").classList.toggle("hidden",completed);
  $("#completedPanel").classList.toggle("hidden",!completed);
});
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

window.addEventListener("error",event=>showError(event.error||new Error(event.message)));
window.addEventListener("unhandledrejection",event=>showError(event.reason||new Error("通信エラー")));
