import { useState } from "react"
import { Link } from "react-router-dom"

function index() {

  const [roomName,setRoomName] = useState(null)
  return (
    <div className='flex'>
      <div className='w-3/5 h-screen px-10 flex items-center justify-center'>
        <div>
          <div className='text-3xl font-extrabold'>Flexy</div>
          <div>
            <input 
              onChange={e => /^[a-zA-Z0-9 ]*$/.test(e.target.value) && setRoomName(e.target.value)} 
              value={roomName}
            type="text" className='bg-slate-100 my-5 p-5 rounded-2xl w-[70vh] outline-none' placeholder='Enter the meeting title' />
          </div>
          <Link to={`/${roomName?.trim().replace(/\s+/g, '-')}`}>
            <button className='bg-blue-500 rounded-2xl text-white p-5 w-[70vh]'>Create Room</button>
          </Link>
          
        </div>
      </div>
      <img src="src/assets/background.jpg" alt="background" className='w-2/5 object-cover'/>
    </div>
  )
}

export default index