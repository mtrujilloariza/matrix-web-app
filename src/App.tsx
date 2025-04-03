import { ChangeEvent, useState } from 'react';
import './App.css'


// async function executeServerCommand(command: string) {
//   try {
//     const response = await fetch(`/api/runcmd?command=${encodeURIComponent(command)}`);
//     if (!response.ok) {
//       throw new Error('Command execution failed');
//     }
//     const result = await response.text();
//     console.log('Command output:', result);
//   } catch (error) {
//     console.error('Failed to execute command:', error);
//   }
// }

async function startPing() {
  try {
    const response = await fetch('api/startPing');
    const result = await response.text();
    console.log(result);
  } catch (error) {
    console.error('Failed to start ping:', error);
  }
}

async function startLEDServer() {
  try {
    const response = await fetch('/api/startLEDServer');
    const result = await response.text();
    console.log(result);
  } catch (error) {
    console.error('Failed to start led server:', error);
  }
}

async function stopPing() {
  try {
    const response = await fetch('api/stopPing');
    const result = await response.text();
    console.log(result);
  } catch (error) {
    console.error('Failed to stop ping:', error);
  }
}

async function stopLEDServer() {
  try {
    const response = await fetch('api/stopLEDServer');
    const result = await response.text();
    console.log(result);
  } catch (error) {
    console.error('Failed to led server:', error);
  }
}

async function sendImage(url: string) {
  try {
    const response = await fetch('api/sendImage', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({img: url}),
    })
    if (!response.ok) {
      console.error('send image failed')
    }
    const result = await response.text();
    console.log('Command output:', result);
  } catch (error) {
    console.error('Failed to execute command:', error);
  }
}

function App() {

  const [inputText, setInputText] = useState('');
  
  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    setInputText(event.target.value);
  };

  const handleInputSubmit = () =>{
    console.log(JSON.stringify({img: inputText}))
    sendImage(inputText)
  }

  return (
    <>
      <h1>LED MATRIX TEST</h1>
      <button onClick={() => {
        startPing()
      }}>Start Ping</button>

      <button onClick={() => {
        stopPing()
      }}>Stop Ping</button>

      <button onClick={() => {
        startLEDServer()
      }}>Start LED SERVER</button>

      <button onClick={() => {
        stopLEDServer()
      }}>Stop LED SERVER</button>

      <img src={inputText}/>

      <input onChange={handleInputChange}/>
      <button onClick={handleInputSubmit}>Send Image</button>
    </>
  )
}

export default App
