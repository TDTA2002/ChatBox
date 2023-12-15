import React, { useEffect, useState } from "react"
import { Channel, Client, Session, Socket } from "@heroiclabs/nakama-js"
import "./App.scss"
import { message } from "antd";
export default function App() {
  const [loginState, setLoginState] = useState<boolean>(false);
  const [client, setClient] = useState<Client | null>(null);
  const [account, setAccount] = useState<any>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [channelCode, setChannelCode] = useState<string>("chat all")
  const [channel, setChannel] = useState<Channel | null>(null)
  const [chatList, setChatList] = useState<{
    channel_id: string;
    code: number;
    content: { text: string };
    create_time: string;
    message_id: string;
    persistent: boolean;
    room_name: string;
    sender_id: string;
    update_time: string;
    username: string;
  }[]>([]);

  useEffect(() => {
    // Create a new client instance.
    var useSSL = false;
    var client = new Client("defaultkey", "127.0.0.1", "7350", useSSL);
    if (client) {
      setClient(client)
    }
  }, [])

  async function getAccount(session: Session) {
    const account = await client?.getAccount(session);
    setAccount(account)
  }
  async function getSocket(session: Session) {
    const secure = false;
    const trace = false;
    const socket = client?.createSocket(secure, trace);
    if (!socket) return
    await socket.connect(session, false)
    setSocket(socket)
  }

  useEffect(() => {
    if (!window.localStorage.getItem("nkauthtoken")) return
    if (!window.localStorage.getItem("nkrefreshtoken")) return
    const authtoken = window.localStorage.getItem("nkauthtoken") || "";
    const refreshtoken = window.localStorage.getItem("nkrefreshtoken") || "";
    let session = Session.restore(authtoken, refreshtoken);
    getAccount(session)
    getSocket(session)
    setLoginState(true)
  }, [client])

  async function getChannel(roomname: string, type: number, persistence: boolean, hidden: boolean) {
    const channel = await socket?.joinChat(roomname, type, persistence, hidden);
    if (!channel) return
    setChannel(channel)
  }

  useEffect(() => {
    if (!socket) return
    socket.onchannelmessage = (message) => {
      // console.info("Message received from channel", message.channel_id);
      console.info("Received message", message);
      setChatList([message, ...chatList])
    };
    getChannel(channelCode, 1, false, false);
  }, [socket, channelCode, chatList])
  return (
    <>
      {loginState ?
        (
          <div className="boxChat">
            <h2>Hello: {account?.user?.username}</h2>
            <h3>Room: {channelCode}
              <button onClick={() => {
                let newChannel = window.prompt("Nhập kênh chát mới") || "Chat all";
                setChannelCode(newChannel)
              }}>Save</button>
            </h3>

            <div>
              <input id="message_input" type="text" placeholder="Message..." />
              <button onClick={() => {
                const message = { "text": (document.querySelector("#message_input") as HTMLInputElement).value };
                if (channel) socket?.writeChatMessage(channel?.id, message);
                (document.querySelector("#message_input") as HTMLInputElement).value = "";
              }}>Send</button>
            </div>
            <div>
              {chatList.map(chat => (
                <p>
                  <b>{chat.username}</b>: <span>{chat.content.text}</span>
                  <i>{chat.create_time}</i>
                </p>
              ))}
            </div>
          </div>
        ) : (
          <div className="mainLogin">
            <form onSubmit={async (e: React.FormEvent) => {
              e.preventDefault();
              let data = {
                email: (e.target as any).email.value,
                password: (e.target as any).password.value,
              }
              try {
                const session = await client?.authenticateEmail(data.email, data.password);
                console.log(session);
                if (!session) throw false
                localStorage.setItem("nkauthtoken", session?.token)
                localStorage.setItem("nkrefreshtoken", session?.refresh_token)
                message.success("Đăng nhập thành công")
                window.location.reload();
              } catch (err) {
                message.error("Lỗi đăng nhập vui lòng kiểm tra lại email và mật khẩu!")
              }
            }} className="loginForm">
              <div className="emailInput">
                Email: <input name="email" type="email" placeholder="Login email" />
              </div>
              <div className="passwordInput">
                Password: <input name="password" type="password" placeholder="Login password" />
              </div>
              <button type="submit">Login</button>
            </form>
          </div>
        )}
    </>
  )
}