// 文言・上司のセリフ・判定表。処理は game.js
'use strict'

const UI = {
  ja: {
    title1: 'うなずき', title2: 'マスター',
    tagline: '上司の長〜い話を、聞いてるフリでうなずき切れ。',
    start: '会議に出る', how: '遊び方', back: 'もどる', ok: 'わかった、出る',
    howTitle: '遊び方',
    how1pc: '上司のセリフが「〜ね？」「〜わかる？」で終わる瞬間に<b>スペースキー</b>でうなずく。',
    how1sp: '上司のセリフが「〜ね？」「〜わかる？」で終わる瞬間に<b>画面をタップ</b>してうなずく。',
    how2: '下の<b>輪っかが重なった瞬間</b>がジャスト。早すぎ・遅すぎ・うなずき忘れはミス。',
    how3: '<b>眠気</b>は勝手にたまる。うなずくと少し覚める。満タンで白目になったら<b>連打</b>で起きろ。上司にバレると激怒。',
    how4: '「で、君はどう思う？」と振られたら、<b>3秒以内</b>にそれっぽい方を選べ。',
    howGoal: '約60秒の会議を乗り切ると「社畜検定」の級が決まる。',
    sleep: 'ねむけ', mood: '上司の機嫌', meeting: '会議',
    nodPc: 'SPACE', nodSp: 'TAP',
    wakeUp: '連打して起きろ！',
    resultHead: '社畜検定 認定証',
    you: 'あなた 殿',
    sPerfect: '完璧うなずき', sGood: 'まあまあ', sMiss: 'ミス', sShirome: '白目', sMood: '上司の機嫌', sAnswer: 'ナイス返事',
    times: '回',
    again: 'もう一回', save: '画像を保存', toTitle: 'タイトル',
    saved: '画像を保存しました', shared: '共有しました',
    announce: '社畜検定 結果発表', judging: '審査中…',
    bossName: '部長', subName: 'あなた',
    endLine: '…ということで、以上。おつかれ！',
    startLine: 'じゃ、始めようか。手短にね。',
    shareText: 'うなずきマスターで社畜検定{g}でした',
    grade: '級', special: '特級',
    noticeLine: 'おい！！寝てるだろ！！',
    askTimeout: '……（沈黙）',
    bossAfterTimeout: '…聞いてた？',
    tapAnywhere: 'どこでもタップでうなずく',
    pcHint: 'SPACE でうなずく',
  },
  en: {
    title1: 'NOD', title2: 'MASTER',
    tagline: "Survive the boss's endless talk by nodding like you're listening.",
    start: 'Join the meeting', how: 'How to play', back: 'Back', ok: "Let's go",
    howTitle: 'How to play',
    how1pc: 'When the boss ends a line with "right?" or "you know?", press <b>SPACE</b> to nod.',
    how1sp: 'When the boss ends a line with "right?" or "you know?", <b>tap the screen</b> to nod.',
    how2: 'Nod <b>when the rings meet</b>. Too early, too late or forgetting counts as a miss.',
    how3: '<b>Sleepiness</b> builds up. Nodding wakes you a little. When your eyes roll back, <b>mash</b> to wake up before the boss notices.',
    how4: 'When he asks "So, what do you think?", pick the answer that sounds smart within <b>3 seconds</b>.',
    howGoal: 'Survive the ~60 second meeting to get your Office Drone grade.',
    sleep: 'SLEEPY', mood: 'BOSS MOOD', meeting: 'MEETING',
    nodPc: 'SPACE', nodSp: 'TAP',
    wakeUp: 'MASH TO WAKE UP!',
    resultHead: 'Office Drone Certificate',
    you: 'Awarded to: You',
    sPerfect: 'Perfect', sGood: 'OK', sMiss: 'Misses', sShirome: 'Eye-rolls', sMood: 'Boss mood', sAnswer: 'Answers',
    times: '',
    again: 'Again', save: 'Save', toTitle: 'Title',
    saved: 'Image saved', shared: 'Shared',
    announce: 'THE RESULTS', judging: 'Judging...',
    bossName: 'BOSS', subName: 'YOU',
    endLine: "...and that's all. Great meeting!",
    startLine: "Okay, let's start. I'll keep it short.",
    shareText: 'I got {g} in NOD MASTER',
    grade: '', special: 'Special Grade',
    noticeLine: 'HEY!! ARE YOU SLEEPING?!',
    askTimeout: '...(silence)',
    bossAfterTimeout: '...were you listening?',
    tapAnywhere: 'Tap anywhere to nod',
    pcHint: 'Press SPACE to nod',
  },
}

// 上司のセリフの部品。cue で終わる行の最後の「？」がうなずく瞬間
const TALK = {
  ja: {
    open: ['えー、', 'まあ、', '要するにね、', 'ぶっちゃけ、', '逆に言うと、', 'いい意味で、', '結論から言うと、', 'ここだけの話、', '前にも言ったけど、', 'なんていうかな、', '俺が若い頃はね、', 'つまりだよ、'],
    mid: ['アジェンダを', 'バリューで', 'コミットして', 'シナジーを最大化して', 'エビデンスベースで', 'スキームをローンチして', 'PDCAを爆速で回して', 'ペルソナに刺さる', 'KPIをストレッチして', 'ゼロベースで', 'マネタイズを', 'ナレッジをシェアして', 'イシューをドリルダウンして', 'ステークホルダーと握って', 'ボールを持って', '解像度を上げて', '腹落ちさせて', 'ガバナンスを効かせて', '鳥の目と虫の目で', '肌感で', 'スピード感をもって', 'ワンチームで', 'フワッとした', 'アジャイルに', 'レバレッジを効かせて', 'ファクトを', '落とし所を', 'インパクトのある', 'ブルーオーシャンで', 'パラダイムを', 'エンゲージメントを', 'オーナーシップを持って', 'MECEに', 'ロードマップに', '前向きに検討して', 'いったん持ち帰って'],
    cue: ['いくってことね？', 'そういうことだよね？', 'わかる？', '大事なわけ。ね？', 'やっていこうよ、ね？', 'なんだよ。わかる？', 'っていう話。でしょ？', 'じゃない？', '当たり前だよね？', 'そこなんだよ。ね？', 'しかないよね？', '最強ってこと。ね？'],
    tail: ['…なんだけど、', '…で、えーと、', '…みたいなね、それで、', '…あれ、何の話だっけ。'],
  },
  en: {
    open: ['So, ', 'Basically, ', 'Long story short, ', 'Frankly, ', 'In a good way, ', 'Bottom line, ', 'Between us, ', 'Like I said, ', 'Back in my day, ', 'Moving forward, '],
    mid: ['we leverage the agenda ', 'to synergize the value ', 'and commit to the pipeline ', 'with evidence-based vibes ', 'to circle back on KPIs ', 'and boil the ocean ', 'with a zero-based mindset ', 'to move the needle ', 'and drill down the issue ', 'with full ownership ', 'to align the stakeholders ', 'and run the ball ', 'in a blue ocean ', 'with agile synergy ', 'to unpack the learnings ', 'and touch base offline ', 'at the end of the day ', 'with real bandwidth ', 'to pivot the paradigm ', 'and own the roadmap '],
    cue: ['right?', 'you know?', 'make sense?', 'am I right?', 'yeah?', 'you get it?', 'see?', 'okay?'],
    tail: ['...and um, ', '...anyway, where was I, ', '...so, like, ', '...what was I saying?'],
  },
}

// 「で、君はどう思う？」と2択。good はそれっぽい（ズレてるけど上司は喜ぶ）、bad はズレすぎ
const ASKS = {
  ja: {
    q: ['で、君はどう思う？', '…ってことで、君の意見は？', '君ならどうする？'],
    pairs: [
      ['シナジーですね', 'お腹すきました'],
      ['ゼロベースでコミットします', '今日って何曜日でしたっけ'],
      ['まさにバリューです', '猫を飼いたいです'],
      ['アジャイルにいきましょう', '実家に帰らせていただきます'],
      ['エビデンスが腹落ちしました', '部長、鼻毛が出てます'],
      ['いったん持ち帰ってドリルダウンします', '夢で同じこと聞きました'],
      ['ステークホルダーと握ります', '雨、やみましたかね'],
      ['解像度が爆上がりしました', 'ぼく、実は宇宙人なんです'],
    ],
    good: ['そう！それだよ！（何が？）', 'わかってるねぇ〜！', '君、伸びるよ！', 'それそれ、それが言いたかった！'],
    bad: ['……は？', '今それ関係ある？', '……会議を続けます。', '君、大丈夫？'],
  },
  en: {
    q: ['So, what do you think?', 'Your thoughts?', 'What would YOU do?'],
    pairs: [
      ['Synergy, for sure', "I'm hungry"],
      ["Let's circle back on that", 'What day is it?'],
      ["That's pure value", 'I want a cat'],
      ['Agile all the way', "I'm moving back home"],
      ['The evidence really landed', 'Your nose hair is out'],
      ["I'll take it offline", 'I dreamed this exact meeting'],
      ['Align the stakeholders!', 'Has the rain stopped?'],
      ['Love the bandwidth', "I'm secretly an alien"],
    ],
    good: ["YES! That's it! (What is?)", 'You GET it!', "You'll go far!", 'Exactly what I meant!'],
    bad: ['...Excuse me?', 'How is that relevant?', '...Moving on.', 'Are you okay?'],
  },
}

// 部下（自分）の頭の上に出る一言
const POP = {
  ja: { perfect: ['うんうん！', 'なるほどです！', 'ですよね！', '勉強になります！', 'おっしゃる通り！'], good: ['あ、はい', 'うん…', 'はい〜'], early: ['（早すぎ）'], late: ['（遅い）'], miss: ['（うなずき忘れ）'], extra: ['（うなずきすぎ）'], wake: ['はっ！', 'ね、寝てません！'], snore: 'ぐぅ…' },
  en: { perfect: ['Totally!', 'So true!', 'Wow, yes!', 'Love it!', 'Exactly!'], good: ['Uh, yes', 'Mm-hm', 'Sure...'], early: ['(too early)'], late: ['(too late)'], miss: ['(forgot to nod)'], extra: ['(over-nodding)'], wake: ['Huh?!', "I wasn't asleep!"], snore: 'zzz...' },
}

// 上司の割り込みの一言
const BOSS_POP = {
  ja: { early: ['まだ話してる途中！', '最後まで聞いて？'], miss: ['…聞いてる？', 'ねえ、聞いてる？'], extra: ['うなずきすぎじゃない？'] },
  en: { early: ["I'm not done!", 'Let me finish?'], miss: ['...hello?', 'Are you listening?'], extra: ['Why so much nodding?'] },
}

// 社畜検定の級。score 以上で決まる（上から順に判定）。shiromeMax: 白目がこの回数以下でないと取れない
const GRADES = [
  { id: 's', min: 120, shiromeMax: 0, ja: '特級', en: 'SPECIAL', tja: 'うなずきの神', ten: 'God of Nodding', color: '#c8102e',
    cja: '君…会議の天才だね。明日から全部の会議に出て。', cen: 'You... are a meeting genius. Attend ALL my meetings.' },
  { id: '1', min: 95, shiromeMax: 99, ja: '1級', en: 'GRADE 1', tja: '伝説の相づち職人', ten: 'Legendary Yes-Man', color: '#c8102e',
    cja: 'いやあ、君は話がわかるねえ！（何も話してない）', cen: 'You really get me! (I said nothing.)' },
  { id: '2', min: 70, shiromeMax: 99, ja: '2級', en: 'GRADE 2', tja: 'よく訓練された首', ten: 'Well-Trained Neck', color: '#c8102e',
    cja: 'うんうん、悪くない。次は議事録もよろしく。', cen: 'Not bad. You can take the minutes next time.' },
  { id: '3', min: 45, shiromeMax: 99, ja: '3級', en: 'GRADE 3', tja: 'ふつうの社畜', ten: 'Standard Office Drone', color: '#c8102e',
    cja: 'まあ…聞いてた、よね？', cen: 'Well... you were listening, right?' },
  { id: '4', min: 20, shiromeMax: 99, ja: '4級', en: 'GRADE 4', tja: '半分夢の中', ten: 'Half Asleep', color: '#c8102e',
    cja: '君、途中で何回か宇宙に行ってたよね。', cen: 'You went to outer space a few times, huh?' },
  { id: '5', min: -9999, shiromeMax: 99, ja: '5級', en: 'GRADE 5', tja: '会議室の置物', ten: 'Meeting Room Furniture', color: '#c8102e',
    cja: '……君、今日の議題言える？', cen: "...Can you even tell me today's topic?" },
]
// 条件つきの上司コメント（級のコメントより優先）
const EXTRA_CMT = {
  ja: { manyShirome: '白目のままうなずくの、怖いからやめて。', angry: 'このあと、ちょっと面談ね。', perfectRun: '……君、本当に人間？', noNod: '君、置物？' },
  en: { manyShirome: 'Please stop nodding with your eyes rolled back. It is terrifying.', angry: "Let's have a little 1-on-1 after this.", perfectRun: '...Are you even human?', noNod: 'Are you a statue?' },
}
