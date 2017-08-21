const Bot = require('./lib/Bot');
const SOFA = require('sofa-js');
const Fiat = require('./lib/Fiat');

let bot = new Bot();

// ROUTING

bot.onEvent = function (session, message) {
  switch (message.type) {
    case 'Init':
      welcome(session);
      break;
    case 'Message':
      onMessage(session, message);
      break;
    case 'Command':
      onCommand(session, message);
      break;
    case 'Payment':
      onPayment(session, message);
      break;
    case 'PaymentRequest':
      sendMessage(session, `ไม่ให้หรอก`);
      break
  }
};

function onMessage(session, message) {
  let buying = (session.get('buying') || 0);
  if (buying === 1) {
    buy(session, message);
  } else {
    welcome(session);
  }
}


function onCommand(session, command) {
  switch (command.content.value) {
    case 'buy':
      start_buy(session);
      break;
    case 'lucky_number':
      luckyNumber(session);
      break;
    case 'beg':
      beg(session);
      break;
    case 'cancel':
      cancel(session);
      break;
    case 'buy_10':
      requestBuy(session, 10);
      break;
    case 'buy_100':
      requestBuy(session, 100);
      break;
    case 'buy_1000':
      requestBuy(session, 1000);
      break;
    case 'buy_lucky_10':
      requestBuyLuckyNumber(session, 10);
      break;
    case 'buy_lucky_100':
      requestBuyLuckyNumber(session, 100);
      break;
    case 'buy_lucky_1000':
      requestBuyLuckyNumber(session, 1000);
      break;
  }
}

function onPayment(session, message) {
  if (message.fromAddress === session.config.paymentAddress) {
    // handle payments sent by the bot
    if (message.status === 'confirmed') {
      // perform special action once the payment has been confirmed
      // on the network
    } else if (message.status === 'error') {
      // oops, something went wrong with a payment we tried to send!
    }
  } else {
    // handle payments sent to the bot
    if (message.status === 'unconfirmed') {
      // payment has been sent to the ethereum network, but is not yet confirmed
    } else if (message.status === 'confirmed') {
      // handle when the payment is actually confirmed!
      sendMessage(session, `ได้รับเงินเรียบร้อย 🙏`);
      console.dir(message);
      draw(session, 10);
    } else if (message.status === 'error') {
      sendMessage(session, `เกิดข้อผิดพลาด!🚫`);
      session.set('buying', 0);
    }
  }
}

// STATES

function welcome(session) {
  let welcome_msg = `ยินดีต้อนรับเข้าสู่ หวนหวย
บริการรับแทงหวย 2 ตัว
ถูกรางวัลจ่าย 70 ต่อ 1
ท่านจะได้รางวัลอัตโนมัติเมื่อท่านถูกรางวัล`;
  sendMessage(session, welcome_msg);
}

function cancel(session) {
  session.set('buying', 0);
  welcome(session);
}

function start_buy(session) {
  session.set('buying', 1);
  // Prompt user to input number.
  let message = `กรุณาพิมพ์เลขเด็ดของท่าน`;
  session.reply(SOFA.Message({
    body: message,
    controls: null,
    showKeyboard: true,
  }))
}

function buy(session, message) {
  let num = parseInt(message.content.body);
  if (isNaN(num) || num < 0 || num > 100) {
    // Prompt repeat number.
    let message = `ตัวเลขไม่ถูกต้อง กรุณาพิมพ์อีกครั้ง`;
    let controls = [
      {type: 'button', label: 'ยกเลิก', value: 'cancel'}
    ];
    session.reply(SOFA.Message({
      body: message,
      controls: controls,
      showKeyboard: true,
    }));

    session.set('num', num);
  } else {
    let controls = [
      {type: 'button', label: 'ซื้อ 10', value: 'buy_lucky_10'},
      {type: 'button', label: 'ซื้อ 100', value: 'buy_lucky_100'},
      {type: 'button', label: 'ซื้อ 1000', value: 'buy_lucky_1000'}
    ];
    session.reply(SOFA.Message({
      body: `ซื้อกี่บาทดี?`,
      controls: controls,
      showKeyboard: false,
    }))
  }
}

function requestBuyLuckyNumber(session, number, amount) {
  session.set('num', number);
  requestBuy(session, amount);
}

function requestBuy(session, amount) {
  Fiat.fetch().then((toEth) => {
    session.requestEth(toEth.THB(amount))
  })
}

function draw(session, buyAmount) {
  let num = session.get('num', 0);
  let rand = Math.floor(Math.random() * 100);
  let num_str = pad(num, 2);
  let rand_str = pad(rand, 2);
  sendMessage(session, `เลขที่ท่านซื้อคือ ${num_str}`);
  sendMessage(session, `เลขที่ออกคือ ${rand_str}`);
  if (rand === num) {
    let prize = 70.0 * buyAmount;
    sendMessage(session, `ของแสดงความยินดีด้วย ท่านถูกหวย ${buyAmount} บาท ได้รางวัล ${prize} บาท`);
    //TODO sending money.
  } else {
    sendMessage(session, `ของแสดงความเสียใจด้วย ท่านถูกหวยแดก`);
  }
}

// example of how to store state on each user
function luckyNumber(session) {
  let lucky = Math.floor(Math.random() * 100);
  let controls = [
    {type: 'button', label: 'ซื้อ 10', value: 'buy_10'},
    {type: 'button', label: 'ซื้อ 100', value: 'buy_100'},
    {type: 'button', label: 'ซื้อ 1000', value: 'buy_1000'}
  ];
  session.reply(SOFA.Message({
    body: `${lucky} ซื้อเลยป่ะ?`,
    controls: controls,
    showKeyboard: false,
  }))
}

function beg(session) {
  let given = (session.get('given') || 0);
  if (given === 0) {
    session.set('given', 1);
    // Give 100 THB at current exchange rates
    Fiat.fetch().then((toEth) => {
      session.sendEth(toEth.THB(100));
    })
  } else {
    let rand = Math.floor(Math.random() * 1000);
    if (rand === 888) {
      sendMessage(session, `เคยให้ไปแล้วแต่ก็จะให้อีกล่ะกัน ถือว่าเอาบุญ`);
      Fiat.fetch().then((toEth) => {
        session.sendEth(toEth.THB(100));
      })
    } else {
      sendMessage(session, `เคยให้ไปแล้วนิ`);
    }
  }
}

// HELPERS

function sendMessage(session, message) {
  let controls = [
    {type: 'button', label: 'ซื้อหวย', value: 'buy'},
    {type: 'button', label: 'ขอเลขเด็ดหน่อย', value: 'lucky_number'},
    {type: 'button', label: 'ขอเงินหน่อยโดนหวยแดก', value: 'beg'}
  ];
  session.reply(SOFA.Message({
    body: message,
    controls: controls,
    showKeyboard: false,
  }))
}

function pad(n, width, z) {
  z = z || '0';
  n = n + '';
  return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
}
