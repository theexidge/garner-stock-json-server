const jsonServer = require("json-server");
const server = jsonServer.create();
const router = jsonServer.router("db.json");
const middlewares = jsonServer.defaults();
const data = require("./db.json");
var fs = require("fs");

const { v4: uuidv4 } = require("uuid");

server.use(middlewares);
server.use(jsonServer.bodyParser);
const tradingChatResponses = {
  "hi": "Hello, My name is GarnerBot. How can I help you?",
  "how do i start trading stocks": "To start trading stocks, you'll need to open a brokerage account, research companies you want to invest in, and place buy or sell orders through your broker. It's important to learn about stock markets and strategies first.",
  "is it safe for teens to trade stocks": "Yes, teens can trade stocks, but it's important to do it responsibly. Consider using a custodial account with parental supervision. Start with a small amount of money and focus on learning before investing heavily.",
  "what is the stock market": "The stock market is a place where people buy and sell shares of publicly traded companies. It allows companies to raise capital by selling ownership stakes, and investors can profit from price fluctuations.",
  "how do i research stocks": "You can research stocks by studying a company's financial reports, analyzing its industry, and keeping an eye on news and trends. Many websites and apps provide stock market research tools for free.",
  "what are the risks of trading stocks": "Stock trading carries risks, including the potential loss of money. Stock prices can be volatile, and it's possible to lose more than you invest. Diversification and risk management are essential.",
  "what trading strategies should i consider": "Common trading strategies include day trading, swing trading, and long-term investing. Each has its own risk and reward profile. Start with a strategy that matches your risk tolerance and time commitment.",
  "are there any good books or courses on trading": "Yes, there are many books and online courses that can help you learn about trading. Some popular options include 'The Intelligent Investor' by Benjamin Graham and online courses from platforms like Coursera and Udemy.",
  "can you recommend any trading apps for teens": "Certainly! Some trading apps suitable for teens include Robinhood, E*TRADE, and Webull. Make sure to check the age requirements and parental controls on these platforms.",
  "what is short selling": "Short selling is a trading strategy where an investor borrows a stock and sells it with the hope that its price will decrease. They then buy the stock back at a lower price to return it to the lender, making a profit from the price difference.",
  "tell me more about garner (the trading app)": "Garner is a stock trading app developed by Barings bank. It offers a user-friendly platform for trading stocks, accessing research and market data, and managing your investments. It's a great choice for both beginners and experienced traders.",
  "how can i protect my investments from market crashes": "To protect your investments from market crashes, consider diversifying your portfolio by investing in different asset classes, such as stocks, bonds, and real estate. Additionally, having an emergency fund and a long-term investment horizon can help you weather market downturns.",
};
server.post("/buystock", (req, res) => {
  console.log(req.body);
  try {
    const { email, type, buyprice, count, symbol, name, kind } = req.body;
    let balance = 0;
    let balanceObj = null;
    let id = uuidv4();
    if (type == "virtual") {
      balanceObj = data["virtualwallet"].find((item) => item.id === email);
      
      balance = balanceObj.balance;
    } else {
      balanceObj = data["realwallet"].find((item) => item.id === email);
      balance = balanceObj.balance;
    }
    if (balance < buyprice * count) {
      res.status(401).json({ success: false, error: "Not Enough Money" });
    } 
    else if(buyprice * count > (data["users"].find((item) => item.email === email)).maxLimit){
      res.status(401).json({ success: false, error: "Max Limit Exceeded" });
    }else {
      balanceObj.balance -= buyprice * count;
      balanceObj.invested += buyprice * count;
      balanceObj.recentstock = {
          symbol: symbol,
          buyprice: buyprice,
          count: count,
          total: buyprice * count,
          timestamp: Date.now()
      };
      if(balanceObj.recentfive.length == 5){
          balanceObj.recentfive.splice(0, 1);
      }
      balanceObj.recentfive.push({
          symbol: symbol,
          buyprice: buyprice,
          id: id,
          count: count,
          total: buyprice * count
      });
      if (type == "virtual") {
        data["vholdings"].push({
          id: id,
          email: email,
          name: name,
          symbol: symbol,
          count: count,
          buyprice: buyprice,
          kind: kind,
        });
      } else {
        data["rholdings"].push({
          id: id,
          email: email,
          name: name,
          symbol: symbol,
          count: count,
          buyprice: buyprice,
          kind: kind,
        });
      }
      let transactionData = {
          id: id,
          kind: kind,
          symbol: symbol,
          name: name,
          count: count,
          buyprice: buyprice,
          email: email,
          event: "userbuying",
        };
      data["transaction"].push(transactionData);
      fs.writeFileSync("db.json", JSON.stringify(data, null, 2));
      res.status(200).json({ success: true, error: null, data: transactionData });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error });
    console.log(error);
  }
});

server.post("/squareoff", (req, res) => {
  console.log(req.body);
  try {
    const { id, type, email, sellprice: sellprice } = req.body;
    let holdingObj = null;
    let index = null;
    let balanceObj = null;
    if (type == "virtual") {
      holdingObj = data["vholdings"].find((item) => item.id === id);
      index = data["vholdings"].indexOf(holdingObj);
    } else {
      holdingObj = data["rholdings"].indexOf(
        data["rholdings"].find((item) => item.id === id)
      );
      index = data["rholdings"].indexOf(holdingObj);
    }
  
    if (type == "virtual") {
      balanceObj = data["virtualwallet"].find((item) => item.id === email);
      balanceObj.balance += (holdingObj.kind == "buy" ? sellprice*holdingObj.count : (2*holdingObj.buyprice -sellprice)*holdingObj.count);
      balanceObj.invested -= holdingObj.buyprice * holdingObj.count;
      if (index > -1) {
        data["vholdings"].splice(index, 1);
      }
    } else {
      balanceObj = data["realwallet"].find((item) => item.id === email);
      balanceObj.balance += (holdingObj.kind == "buy" ? sellprice*holdingObj.count : (2*holdingObj.buyprice -sellprice)*holdingObj.count);
      balanceObj.invested -= holdingObj.buyprice * count;
      if (index > -1) {
        data["rholdings"].splice(index, 1);
      }
    }
    let transactionData = {
      id: uuidv4(),
      kind: holdingObj.kind,
      symbol: holdingObj.symbol,
      name: holdingObj.name,
      count: holdingObj.count,
      sellprice: sellprice,
      email: holdingObj.email,
      event: "userselling",
    };
    data["transaction"].push(transactionData);
    fs.writeFileSync("db.json", JSON.stringify(data, null, 2));
    res.status(200).json({ success: true, error: null, data: transactionData });
  } catch (error) {
    res.status(500).json({ success: false, error: error });
  }
});

server.post("/signup", (req,res) => {
  const {email, fname, lname, age, password, role} = req.body;
  try {
    let check = data["users"].find((item) => item.email === email);
    if(check){
      res.status(401).json({success: false, error: "User Already exists"});
    }
    else{
      let userData = {
        id: email,
        fname: fname,
        email: email,
        lname: lname,
        age: age,
        password: password,
        role: role,
        parentemail: "",
        childemail: "",
        maxLimit: 99999999,
      };
      data["users"].push(userData);
      data["realwallet"].push({
        id: email,
        email: email,
        balance: 0,
        invested: 0,
        recentstock: {},
        recentfive: []
      });
      data["virtualwallet"].push({
        id: email,
        email: email,
        balance: 10000,
        invested: 0,
        recentstock: {},
        recentfive: []
      });
      fs.writeFileSync("db.json", JSON.stringify(data, null, 2));
      res.status(201).json({ success: true, error: null, data: userData });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error });
  }
});

server.post("/login", (req,res) => {
  const {email, password} = req.body;
  try {
    let check = data["users"].find((item) => item.email === email);
    if(check){
      if(check.password == password){
        
        res.status(200).json({success: true, error: null, data: check});
      }
      else{
        res.status(400).json({ success: false, error: "Wrong Password" });
      }
    }
    else{
      res.status(400).json({ success: false, error: "User Doesn't exist" });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error });
  }

  
});

server.patch("/setparent", (req,res) => {
  const {email, parentemail: parentemail} = req.body;
  try {
    let childObj = data["users"].find((item) => item.email === email);
    let parentObj = data["users"].find((item) => item.email === parentemail);
    childObj.parentemail = parentemail;
    parentObj.childemail = email;
  
    fs.writeFileSync("db.json", JSON.stringify(data, null, 2));
    res.status(200).json({ success: true, error: null, data: "Modified Successfully" });
  } catch (error) {
    res.status(500).json({ success: false, error: error });
    
  }
});
server.post("/chat", (req, res) => {
  let {chatrequest: chatrequest} = req.body;
  try {
    chatrequest = chatrequest.replace(/\?/g, '').toLowerCase();
    if(Object.keys(tradingChatResponses).find((item) => item === chatrequest) === undefined){
      res.status(200).json({success: false, error: "No Request Found", data: "I am still learning. Meanwhile you can refer web for your questions."});
    }
    else{
      res.status(200).json({success: true, error: null, data: tradingChatResponses[chatrequest]});
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error });
    console.log(error);
  }
});
server.use(router);

server.listen(3000, () => {
  console.log("JSON Server is running");
});
