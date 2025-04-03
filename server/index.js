import express from 'express';
import { exec, spawn } from 'child_process';

import bodyParser from 'body-parser';


const app = express();

app.use(bodyParser.json()); // Parse JSON bodies

// Endpoint to execute a bash command
// app.get('/api/runcmd', async (req, res) => {
//   const { command } = req.query;
//   try {
// 	  console.log(command)
//     const result = await runCommand(command);
//     res.send(result);
//   } catch (error) {
//     res.status(500).send(error.message);
//   }
// });

let pingProcess;

app.get('/api/startPing', (req, res) => {
  if (!pingProcess) {
    pingProcess = spawn('ping', ['google.com']);

    pingProcess.stdout.on('data', (data) => {
      console.log(`Received: ${data}`);
      // You can process or send this output as needed (e.g., emit it to clients via WebSocket, etc.)
    });

    pingProcess.stderr.on('data', (data) => {
      console.error(`Error: ${data}`);
    });

    res.send('Ping started');
  } else {
    res.send('Ping already running');
  }
});

app.get('/api/stopPing', (req, res) => {
  if (pingProcess) {
    pingProcess.kill();
    pingProcess = null;
    res.send('Ping stopped');
  } else {
    res.send('No ping running');
  }
});

let ledServerProcess;

app.get('/api/startLEDServer', (req, res) => {
  if (!ledServerProcess) {
    ledServerProcess = spawn('sudo', ['/home/pi/flaschen-taschen/server/ft-server', '--led-rows=64', '--led-cols=64', '--led-gpio-mapping=adafruit-hat-pwm', '--led-slowdown-gpio=5'])
    
    ledServerProcess.stdout.on('data', (data) => {
      console.log(`Received: ${data}`);
      // You can process or send this output as needed (e.g., emit it to clients via WebSocket, etc.)
    });

    ledServerProcess.stderr.on('data', (data) => {
      console.error(`Error: ${data}`);
    });

    res.send('LED Server started')
  } else {
    res.send('LED Server already started')
  }
})

app.get('/api/stopLEDServer', (req, res) => {
  if (ledServerProcess) {
    ledServerProcess.kill();
    ledServerProcess = null;
    res.send('LED Server stopped');
  } else {
    res.send('No LED Server running');
  }
});


app.post('/api/sendImage', (req, res) => {
  if(true){
    console.log(`curl -s ${req.body.img} | ./server/bin/send-image -g 64x64 -h localhost -`)

    exec(`curl -s ${req.body.img} | ./server/bin/send-image -g 64x64 -h localhost -`, (error, stdout, stderr) => {
      if (error) {
        console.error(`exec error: ${error}`);
        return;
      }
      console.log(`stdout: ${stdout}`);
      console.error(`stderr: ${stderr}`);
    });
    res.send('Img recieved')
  } else {
    res.send('No LED Server running')
  }
})

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
