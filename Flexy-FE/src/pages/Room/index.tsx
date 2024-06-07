import { useState, useEffect, useRef } from 'react'
import io, {Socket} from 'socket.io-client'
import Peer from 'peerjs'
import { useParams } from 'react-router-dom'
import { BiSolidCamera } from "react-icons/bi"
import { RiMicFill } from "react-icons/ri"
import { FaPhoneSlash } from "react-icons/fa"
import { FaTelegramPlane } from "react-icons/fa"

interface User {
    id: string;
    name: string;
}

interface RemoteStream {
    user: User;
    stream: MediaStream;
}

function index() {
    const { roomname } = useParams<{ roomname: string }>()
    const [localName, setLocalName] = useState<string>('')
    const [localID, setLocalID] = useState<string | null>(null)
    const [modalOpen, setModalOpen] = useState<boolean>(true)
    const [remoteStreams, setRemoteStreams] = useState<RemoteStream[]>([])
    const currentUserVideoRef = useRef<HTMLVideoElement>(null)
    const previewUserVideoRef = useRef<HTMLVideoElement>(null)
    const localNameRef = useRef<string | null>(null)
    const peerRef = useRef<Peer | null>(null)
    const socketRef = useRef<Socket | null>(null)

    useEffect(() => { localNameRef.current = localName }, [localName])
    useEffect(() => {
        const peer = new Peer(undefined, {
            path: '/peerjs',
            host: '/',
            port: Number(process.env.PORT || '3000'),
        })

        const socket = io(process.env.SOCKET_URL || 'http://localhost:3000', { secure: true })

        navigator.mediaDevices
            .getUserMedia({
                video: true,
                audio: true,
            })
            .then((stream: MediaStream) => {
                if (previewUserVideoRef.current) {
                    previewUserVideoRef.current.srcObject = stream
                    previewUserVideoRef.current.play()
                }

                peer.on('call', (call) => {
                    call.answer(stream)
                    call.on('stream', (userVideoStream) => {
                        addRemoteStream({ id: call.peer, name: call.metadata.name }, userVideoStream)
                    })
                })

                socket.on('user-connected', (user: User) => {
                    const call = peer.call(user.id, stream, { metadata: { name: localNameRef.current } })
                    call.on('stream', (userVideoStream) => {
                        addRemoteStream(user, userVideoStream)
                    })
                    call.on('close', () => {
                        removeRemoteStream(user)
                    })
                })

                socket.on('user-disconnected', (user: User) => {
                    removeRemoteStream(user)
                })
            })

        peer.on('open', (id) => {
            setLocalID(id)
        })

        peerRef.current = peer
        socketRef.current = socket

        return () => {
            socket.disconnect()
            peer.disconnect()
            if (previewUserVideoRef.current && previewUserVideoRef.current.srcObject instanceof MediaStream) {
                previewUserVideoRef.current.srcObject.getTracks().forEach((track) => track.stop())
            }
        }
    }, [roomname])

    const addRemoteStream = (user: User, stream: MediaStream) => {
        setRemoteStreams((remoteStreams) => ([
            ...remoteStreams.filter((remoteStream) => remoteStream.user.id !== user.id),
            { user, stream }
        ]))
    }

    const removeRemoteStream = (user: User) => {
        setRemoteStreams((remoteStreams) =>
            remoteStreams.filter((remoteStream) => remoteStream.user.id !== user.id)
        )
    }

    const handleJoin = () => {
        if (localID && socketRef.current) {
            currentUserVideoRef.current!.srcObject = previewUserVideoRef.current!.srcObject
            currentUserVideoRef.current!.play()
            socketRef.current.emit('join-room', roomname, { id: localID, name: localName })
            setModalOpen(false)
        }
    }

    const RemoteVideo = ({ remoteStream }: { remoteStream: RemoteStream }) => {
        const remoteVideoRef = useRef<HTMLVideoElement>(null)

        useEffect(() => {
            if (remoteStream) {
                remoteVideoRef.current!.srcObject = remoteStream.stream
                remoteVideoRef.current!.play()
            }
        }, [remoteStream])

        return (
            <div className="col-span-1 relative overflow-hidden rounded-3xl">
                <video ref={remoteVideoRef} autoPlay className="bg-slate-700 w-full h-full object-cover"></video>
                <div className="absolute right-3 top-3 flex">
                    <div className='bg-white rounded-full w-6 h-6 mx-1'></div>
                    <div className='bg-blue-500 rounded-full w-6 h-6 mx-1'></div>
                </div>
                <div className="absolute left-3 bottom-3">
                    <div className="rounded-xl px-4 py-1 text-xs text-white backdrop-blur-sm bg-white/30">{remoteStream.user.name}</div>
                </div>
            </div>
        )
    }

    return (
        <div className='flex'>
            {modalOpen &&
                <div className="fixed inset-0 flex items-center justify-center backdrop-blur-sm bg-gray-800 bg-opacity-75 z-50">
                    <div className="bg-white rounded-3xl shadow-lg">
                        <div className="p-4">
                            <h2 className="text-xl font-semibold mb-4">Preview</h2>
                            <div className='relative overflow-hidden w-[100vh]'>
                                <video ref={previewUserVideoRef} autoPlay className="bg-slate-700 rounded-3xl w-full h-[50vh] object-cover"></video>
                                <div className="absolute right-5 top-5 flex">
                                    <div className='bg-white rounded-full w-10 h-10 mx-1'></div>
                                    <div className='bg-blue-500 rounded-full w-10 h-10 mx-1'></div>
                                </div>
                            </div>
                            <div className='flex mt-5'>
                                <input
                                    onChange={e => /^[a-zA-Z0-9 ]*$/.test(e.target.value) && setLocalName(e.target.value)}
                                    value={localName}
                                    type="text" className='bg-slate-100 grow p-5 mr-5 rounded-2xl w-[70vh] outline-none' placeholder='Enter your name' />
                                <button
                                    onClick={handleJoin}
                                    className=" p-5 bg-blue-500 text-white rounded-xl"
                                >
                                    Start
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            }
            <div className='w-3/5 bg-slate-100 h-screen px-10'>
                <div className='bg-white rounded-full px-10 py-6 my-5'>
                    <div className='text-2xl'>Meeting title</div>
                    <div className='text-xl text-slate-500'>Room Name</div>
                </div>
                <div className="grid grid-cols-3 gap-4 my-5 h-[70vh] grid-rows-[auto_1fr]">
                    <div className="col-span-3 relative overflow-hidden rounded-3xl">
                        <video ref={currentUserVideoRef} autoPlay className="bg-slate-700 w-full h-[50vh] object-cover"></video>
                        <div className="absolute left-5 bottom-5">
                            <div className="rounded-xl px-4 py-1 text-white backdrop-blur-sm bg-white/30">{localName}</div>
                        </div>
                        <div className="absolute right-5 top-5 flex">
                            <div className='bg-white rounded-full w-10 h-10 mx-1'></div>
                            <div className='bg-blue-500 rounded-full w-10 h-10 mx-1'></div>
                        </div>
                    </div>
                    {remoteStreams.map((remoteStream, index) => (<RemoteVideo key={index} remoteStream={remoteStream} />))}
                </div>
                <div className='flex justify-center  my-5'>
                    <BiSolidCamera className='bg-blue-500 text-white rounded-full w-16 h-16 p-4  mx-2' />
                    <RiMicFill className='bg-orange-600 text-white rounded-full w-16 h-16 p-4  mx-2' />
                    <div className='bg-white rounded-full w-16 h-16 mx-2'></div>
                    <div className='bg-white rounded-full w-16 h-16 mx-2'></div>
                    <FaPhoneSlash className='bg-orange-600 text-white rounded-full w-16 h-16 p-4  mx-2' />
                </div>
            </div>
            <div className='w-2/5 pt-10 px-10'>
                <div>
                    <div className='text-2xl'>Participants</div>
                    <div className='bg-slate-100 rounded-3xl p-5 my-5'>
                        <div className='flex justify-between bg-white text-xl rounded-3xl p-5 my-5'>
                            <div className=''>JonhDoe</div>
                            <div className='flex'>
                                <BiSolidCamera className='w-6 h-6 mr-2' />
                                <RiMicFill className='w-6 h-6 mr-2' />
                            </div>
                        </div>
                        <div className='flex justify-between bg-white text-xl rounded-3xl p-5 my-5'>
                            <div className=''>JonhDoe2</div>
                            <div className='flex'>
                                <BiSolidCamera className='w-6 h-6 mr-2' />
                                <RiMicFill className='w-6 h-6 mr-2' />
                            </div>
                        </div>            <div className='flex justify-between bg-white text-xl rounded-3xl p-5 my-5'>
                            <div className=''>JonhDoe3</div>
                            <div className='flex'>
                                <BiSolidCamera className='w-6 h-6 mr-2' />
                                <RiMicFill className='w-6 h-6 mr-2' />
                            </div>
                        </div>
                    </div>
                </div>
                <div>
                    <div className='text-2xl'>Chat</div>
                    <div className='bg-slate-100 rounded-3xl p-5 my-5'>
                        <div className='flex my-5'>
                            <div className="bg-slate-400 rounded-full w-10 h-10 flex items-center justify-center mr-5">
                                <div className="text-white">J</div>
                            </div>
                            <div>
                                <div className='text-slate-500 ml-2 mb-2'>JonhDoe</div>
                                <div className='bg-white  rounded-3xl py-2 px-5'>Hii JonhDoe2 and JonhDoe3</div>
                            </div>
                        </div>
                        <div className='flex my-5'>
                            <div className="bg-slate-400 rounded-full w-10 h-10 flex items-center justify-center mr-5">
                                <div className="text-white">J</div>
                            </div>
                            <div>
                                <div className='text-slate-500 ml-2 mb-2'>JonhDoe2</div>
                                <div className='bg-white  rounded-3xl py-2 px-5'>Hii JonhDoe and JonhDoe3</div>
                            </div>
                        </div>

                        <div className='flex my-5 flex-row-reverse'>
                            <div className="bg-slate-400 rounded-full w-10 h-10 flex items-center justify-center ml-5">
                                <div className="text-white">J</div>
                            </div>
                            <div>
                                <div className='text-slate-500 ml-2 mb-2'>JonhDoe</div>
                                <div className='bg-white  rounded-3xl py-2 px-5'>Hii everyone </div>
                            </div>
                        </div>
                        <div className='bg-white flex w-full p-2 rounded-3xl'>
                            <input type="text" className='p-2 grow' />
                            <button className='bg-blue-500 rounded-full text-white w-10 h-10 mx-2 flex items-center justify-center'>
                                <FaTelegramPlane className=' w-6 h-6 ' />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default index

