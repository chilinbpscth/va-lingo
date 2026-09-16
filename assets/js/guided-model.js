/* Shared lesson definitions and response rules. No inference or automatic ability scores. */
(function(root) {
  'use strict';
  const q = (id, label, question, observe, words, frame) => ({id,label,question,hints:[observe,words,frame]});
  const templates = {
    p2: {
      id:'p2', version:1, grade:'p2', ks:'ks1', title:'百變蒙羅麗莎', subtitle:'從一個表情，發現不一樣的故事', topicId:'p2-s1-3d', medium:'拼貼',
      reference:{id:'mona-lisa',title:'蒙羅麗莎',artist:'達文西',date:'約1503–1519年',image:'assets/guided/mona-lisa.jpg',credit:'羅浮宮藏品；Wikimedia Commons 公有領域數碼複製圖（修整版本）',url:'https://collections.louvre.fr/ark:/53355/cl010062370',imageSource:'https://commons.wikimedia.org/wiki/File:Mona_Lisa,_by_Leonardo_da_Vinci,_from_C2RMF_retouched.jpg'},
      context:'先看看肖像的表情、衣服和背景。這是一幅歷史肖像；你的觀察與猜想，可以與其他人不同。',
      questions:{
        reference:[
          q('observe','我的發現','你最留意哪個地方？它是怎樣的？','先找一個你留意的地方：人物、衣服、背景，或者其他地方。','眼睛、嘴角、形狀、顏色、明暗','我留意到＿＿，它是＿＿的。'),
          q('effect','我的想法','你剛才留意的地方，令你想到甚麼，或有甚麼感覺？','回看剛才那個地方。它像在做甚麼？你想到生活中甚麼時候？','平靜、好奇、有趣、奇怪、未有特別感覺','我看見＿＿，所以覺得／想到＿＿。'),
          q('judge','我的回應','你喜歡這個表現嗎？用剛才看到的地方說說。','喜歡、不喜歡或未能決定都可以。找一個地方說明你的想法。','喜歡、不喜歡、還未決定、因為','我＿＿這個表現，因為我看到＿＿。')
        ],
        self:[
          q('observe','我用了甚麼','看看自己的拼貼。你改變了哪個地方？用了甚麼方法？','留意你剪貼的形狀、表情、衣服或背景。','剪、貼、形狀、顏色、重疊','我把＿＿改成＿＿，用了＿＿。'),
          q('effect','我想表達','你想讓人看到作品時，有甚麼感覺或聯想？','可以指着你最想別人留意的地方說。','有趣、平靜、熱鬧、想起','我想讓人覺得＿＿，所以我用了＿＿。'),
          q('judge','回看我的作品','哪個地方做到了你的想法？你從哪裏看出來？','回看實際作品。也可以說還想再試一試的地方。','做到了、還想試、因為','我覺得＿＿做到了，因為＿＿。')
        ],
        peer:[
          q('observe','我看到的發現','你在同學的作品看到甚麼特別的地方？','先說真的看到的東西；可以指一處，不用猜同學的心情。','形狀、顏色、表情、背景、拼貼','我看到＿＿，它是＿＿的。'),
          q('effect','我的感覺','這個地方令你想到甚麼，或有甚麼感覺？','回到剛才的發現，說說它帶給你的感覺。','有趣、平靜、好奇、未有特別感覺','我看到＿＿，令我想到／覺得＿＿。'),
          q('judge','送給同學的話','你怎樣看這個表現？用作品中的地方說說。','可以欣賞，也可以提出不同想法；說作品，不評斷同學。','我留意到、我覺得、因為','我覺得＿＿，因為作品中的＿＿。')
        ]
      }
    },
    p5: {
      id:'p5', version:1, grade:'p5', ks:'ks2', title:'梵高的流動線條', subtitle:'讓目光跟着線條，讀出畫面的節奏', topicId:'p5-s1-2d', medium:'線條與筆觸',
      reference:{id:'wheat-field',title:'有柏樹的麥田',artist:'文森・梵高',date:'1889年',image:'assets/guided/wheat-field.jpg',credit:'The Metropolitan Museum of Art，1993.132；Public Domain',url:'https://www.metmuseum.org/art/collection/search/436535',imageSource:'https://www.metmuseum.org/art/collection/search/436535'},
      context:'這幅1889年的油畫用作觀察線條與筆觸的參考。作品資料與你的推論要分開；不用猜出畫家的唯一答案。',
      questions:{
        reference:[
          q('observe','我的發現','哪一處最吸引你？再找另一處，看看線條或筆觸有甚麼關係。','比較天空、麥田或樹木中的兩處。可以標記，也可以用文字指出位置。','彎曲、方向、重複、疏密、長短、筆觸','我在＿＿看見＿＿；另一處的＿＿則＿＿。'),
          q('effect','視覺效果','這些線條和安排，令畫面產生甚麼效果？','試跟着線條看一遍：你的視線往哪裏移動？感覺怎樣？','動感、節奏、平靜、緊張、連續','＿＿的安排，讓我的視線＿＿，產生＿＿的效果。'),
          q('meaning','我的理解','根據剛才的觀察，你怎樣理解這個景象？','提出一個可能的理解，並回指畫面；作品資料與猜想分開。','可能、令我聯想、根據、因為','根據＿＿，我覺得這個景象可能＿＿。'),
          q('judge','我的評價','你認為這種線條處理，能否表現剛才說的效果？用作品中的例子解釋。','可以肯定，也可以有保留。說清楚哪個安排支持你的判斷。','能夠、部分做到、仍有保留、因為','我認為＿＿能／未能表現＿＿，因為＿＿。')
        ],
        self:[
          q('observe','我的選擇','你用了哪些線條或筆觸？它們在作品中怎樣配合？','比較你作品中的兩個位置，說明方向、重複或疏密。','方向、重複、疏密、對比、筆觸','我在＿＿用了＿＿，和＿＿形成＿＿。'),
          q('effect','我想呈現的效果','你希望這些安排產生甚麼效果？','把你的選擇連到視線移動或觀看感覺。','動感、節奏、重點、平靜','我用＿＿，希望讓人感到＿＿。'),
          q('meaning','我的表達','這些視覺選擇怎樣表達你的想法？','創作意圖由你說明；指出作品中承載這個想法的地方。','想表達、聯想、情境、透過','我想表達＿＿，透過作品中的＿＿呈現。'),
          q('judge','回看與評價','看回作品，哪個地方做到了你的想法？用實際效果支持判斷。','可以指出成功之處，也可以說哪個地方還想再試。','做到、部分做到、證據、下一次','我認為＿＿做到了／仍需調整，因為＿＿。')
        ],
        peer:[
          q('observe','我留意的特徵','找出同學作品中的兩個特徵，說說它們的關係。','先描述可見的線條和安排，不猜作者心情。','方向、重複、疏密、對比','我看到＿＿與＿＿，它們＿＿。'),
          q('effect','我看到的效果','這些安排帶來甚麼效果？','把感覺連回具體的線條、筆觸或位置。','節奏、動感、重點、視線','＿＿的安排令我＿＿。'),
          q('meaning','我的理解','從這些特徵，你怎樣理解這件作品？','這是你的理解，未必等於作者的意圖；提出畫面依據。','可能、讓我想到、根據','根據＿＿，我覺得作品可能＿＿。'),
          q('judge','給同學的評價','你認為這些視覺選擇能否表現剛才的效果？用例子解釋。','評論作品的表現，尊重不同想法；改善建議可選。','我認為、因為、仍有保留','我認為＿＿，作品中的＿＿支持我的想法。')
        ]
      }
    }
  };
  const modes={reference:'名作欣賞',self:'我的作品・自評',peer:'同學作品・互評'};
  const ratings=['未評閱','已見表現','正在發展','證據不足'];
  function clone(x){return JSON.parse(JSON.stringify(x));}
  function makePlan(id, objectiveIds, activities) {
    const t=templates[id]; if(!t) throw new Error('只支援小二及小五試用課題。');
    const ids=t.questions.reference.map(x=>x.id);
    if(!Array.isArray(objectiveIds)||!objectiveIds.length||new Set(objectiveIds).size!==objectiveIds.length||objectiveIds.some(x=>!ids.includes(x))) throw new Error('請選擇有效的本課評賞重點。');
    if(!Array.isArray(activities)||!activities.length||new Set(activities).size!==activities.length||activities.some(x=>!modes[x])||(activities.includes('peer')&&!activities.includes('self'))) throw new Error('互評必須配合自評；請選擇有效活動。');
    const p=clone(t); p.objectiveIds=ids.filter(x=>objectiveIds.includes(x));p.activities=Object.keys(modes).filter(x=>activities.includes(x));
    for(const mode of Object.keys(modes))p.questions[mode]=p.questions[mode].filter(x=>p.objectiveIds.includes(x.id));
    return p;
  }
  function emptyAnswer(){return {text:'',support:'',hintsUsed:[],focus:'',whole:false,location:'',pins:[]};}
  function cleanResponses(plan,mode,input) {
    const out={}; input=input||{};
    for(const question of plan.questions[mode]) {
      const a=input[question.id]||{};
      const text=String(a.text||'').trim();if(text.length>3000)throw new Error('回應太長，請保留重點。');
      const support=['','help','oral'].includes(a.support)?a.support:'';
      const pins=Array.isArray(a.pins)?a.pins:[];
      if(pins.length>8||pins.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y)||p.x<0||p.x>1||p.y<0||p.y>1))throw new Error('作品標記位置不正確。');
      out[question.id]={text,support,hintsUsed:[...new Set((Array.isArray(a.hintsUsed)?a.hintsUsed:[]).filter(x=>[0,1,2].includes(x)))],focus:String(a.focus||'').slice(0,100),whole:!!a.whole,location:String(a.location||'').slice(0,300),pins:pins.map(p=>({x:p.x,y:p.y}))};
    }
    return out;
  }
  function unanswered(plan,mode,responses){return plan.questions[mode].filter(q=>!responses[q.id]||(!responses[q.id].text.trim()&&!responses[q.id].support)).map(q=>q.label);}
  function key(identity,roundId,mode,targetId){return JSON.stringify([identity.schoolYear,identity.classId,identity.studentId,roundId,mode,targetId]);}
  function pairs(members){const sorted=[...members].sort((a,b)=>a.studentId.localeCompare(b.studentId,'en',{numeric:true}));if(sorted.length<2)throw new Error('至少需要兩名已交作品及自評的學生。');return sorted.map((a,i)=>({studentId:a.studentId,targetStudentId:sorted[(i+1)%sorted.length].studentId,artworkId:sorted[(i+1)%sorted.length].artworkId}));}
  const api={templates,modes,ratings,clone,makePlan,emptyAnswer,cleanResponses,unanswered,key,pairs};
  if(typeof module==='object'&&module.exports)module.exports=api;else root.VAGuided=api;
})(typeof globalThis!=='undefined'?globalThis:this);
