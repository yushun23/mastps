import { useState } from 'react'
import { invoke } from '@tauri-apps/api/tauri'

function App() {
  const [greetMsg, setGreetMsg] = useState('')
  const [name, setName] = useState('')

  async function greet() {
    // Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
    setGreetMsg(await invoke('greet', { name }))
  }

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-4xl font-bold text-center mb-8 text-gray-800">
        Mastps - 长篇叙事工程系统
      </h1>

      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
        <p className="text-gray-600 mb-4">
          欢迎使用 Mastps！这是一个本地优先的长篇写作系统。
        </p>

        <div className="space-y-4">
          <input
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            onChange={(e) => setName(e.currentTarget.value)}
            placeholder="输入你的名字..."
          />

          <button
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-md transition duration-200"
            type="button"
            onClick={() => greet()}
          >
            打招呼
          </button>
        </div>

        {greetMsg && (
          <p className="mt-4 text-green-600 font-medium">{greetMsg}</p>
        )}
      </div>

      <div className="mt-8 text-center text-gray-500">
        <p>🚀 准备开始你的写作之旅！</p>
      </div>
    </div>
  )
}

export default App