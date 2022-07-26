const http = require("http");
const cluster = require("cluster");
const { cpus } = require("os");
const process = require("process");

function startExpress() {
  const express = require("express");
  const app = express();
  console.log(`Worker ${process.pid} started`);

  app.get("/api/slow", (req, res) => {
    console.time("slowApi");
    const baseNumber = 7;
    let result = 0;
    for (let i = Math.pow(baseNumber, 7); i >= 0; i--) {
      result += Math.tan(i) * Math.atan(i);
    }
    console.timeEnd("slowApi");
    console.log(`Result number is ${result} - on process ${process.pid}`);
    res.end(`Result number is ${result}`);
    //在响应的时候发送消息
    process.send({ cmd: "notify" });
  });

  app.listen(3000, () => {
    console.log("App listening on port 3000");
  });
}

if (cluster.isMaster) {
  console.log(`Master ${process.pid} running`);
  const cpuLength = cpus().length;
  console.log("cpus cores", cpuLength);
  let numReqs = 0;
  for (let i = 0; i < cpuLength; i++) {
    cluster.fork();
  }
  cluster.on("exit", (worker) => {
    console.log(`Worker ${worker.process.pid} died`);
  });
  // console.log(cluster.workers)
  function messageHandler(msg) {
    if (msg.cmd && msg.cmd === "notify") {
      numReqs += 1;
    }
  }
  setInterval(() => {
    console.log("numReqs:", numReqs);
  }, 1000);
  //拿到所有子进程对象cluster.workers
  //循环监听worker的message事件
  for (const id in cluster.workers) {
    cluster.workers[id].on("message", messageHandler);
  }
} else {
  startExpress();
}
