import React from 'react';
import { Container, Button, ListGroup, ListGroupItem, Form } from 'react-bootstrap'
import { w3cwebsocket as W3CWebSocket } from "websocket";

let client = undefined
let heartbeat = undefined

const RoomIdStorageKey = 'RoomId'
const TeamIdStorageKey = 'TeamId'
const SessionIdStorageKey = 'SessionId'

class PlayerPage extends React.Component {

    constructor(props) {
        super(props);

        this.state = {
            roomJoined: false,
            formRoomId: '',
            formTeamName: '',
            finalResult: undefined
        };

        this.messages = []

        this.handleChange = this.handleChange.bind(this);
        this.joinRoom = this.joinRoom.bind(this);
        this.leaveRoom = this.leaveRoom.bind(this);
        this.rejoinRoom = this.rejoinRoom.bind(this);
        this.answerQuestion = this.answerQuestion.bind(this);
    }

    componentWillMount() {

        let roomId = localStorage.getItem(RoomIdStorageKey)
        let teamId = localStorage.getItem(TeamIdStorageKey)
        let sessionId = localStorage.getItem(SessionIdStorageKey)

        if (roomId != undefined && teamId != undefined && sessionId != undefined) {
            this.messages.push(`Recovered room ${roomId}`)
            this.setState({
                roomId: roomId,
                teamId: teamId,
                sessionId: sessionId
            })
        }
        else {
            localStorage.clear(RoomIdStorageKey)
            localStorage.clear(TeamIdStorageKey)
            localStorage.clear(SessionIdStorageKey)
        }

        this.connect()
    }

    connect() {
        let that = this

        client = new W3CWebSocket('wss://api.quizness-time.com');

        client.onopen = () => {
            console.log('WebSocket Client Connected');
            heartbeat = setInterval(that.ping, 10000)
        };
        client.onclose = (e) => {
            console.log('Socket is closed. Reconnect will be attempted in 1 second.', e.reason);
            clearInterval(heartbeat)
            setTimeout(() => {
                that.connect();
            }, 1000);
        }
        client.onerror = (err) => {
            clearInterval(heartbeat)
            console.error('Socket encountered error: ', err.message, 'Closing socket');
            client.close();
        };
        client.onmessage = (message) => {
            console.log(message);

            let event = JSON.parse(message.data)
            switch (event.type) {
                case "ROOM_JOINED":
                    this.messages.push(`Team '${event.teamName}' has joined the room`)
                    if (event.teamId !== undefined && event.sessionId !== undefined) {
                        this.setState({
                            teamId: event.teamId,
                            sessionId: event.sessionId,
                            roomJoined: true,
                            loading: false
                        })
                        localStorage.setItem(RoomIdStorageKey, this.state.roomId)
                        localStorage.setItem(TeamIdStorageKey, event.teamId)
                        localStorage.setItem(SessionIdStorageKey, event.sessionId)
                    }
                    break;
                case "ROOM_REJOINED":
                    if (event.teamId == this.state.teamId) {
                        this.messages.push(`Team '${event.teamName}' is back!`)
                        this.setState({
                            teamId: event.teamId,
                            sessionId: event.sessionId,
                            roomJoined: true
                        })
                        localStorage.setItem(RoomIdStorageKey, this.state.roomId)
                        localStorage.setItem(TeamIdStorageKey, event.teamId)
                        localStorage.setItem(SessionIdStorageKey, event.sessionId)
                    }
                    break;
                case "GAME_STARTED":
                    this.messages.push(`Game has started`)
                    this.setState({
                        gameStarted: true
                    })
                    break;
                case "GAME_FINISHED":
                    this.messages.push(`Game has finished`)

                    if (event.scores != undefined && event.scores.length > 0) {
                        this.setState({
                            gameStarted: false,
                            finalResult: that.getFinalResult(event.scores[0].teamId == this.state.teamId)
                        })
                    }
                    else {
                        this.setState({
                            gameStarted: false
                        })
                    }
                    break;
                case "QUESTION_PUBLISHED":
                    this.messages.push(`Question published`)
                    this.setState({
                        question: event.question,
                    })
                    break;
                case "ERROR":
                    this.setState({
                        error: event
                    })
                    break;
                default:
                    this.messages.push(message.data)
                    break;
            }

            this.setState({
                lastMessage: message.data,
                loading: false
            });
        };
    }

    // startCountDown(seconds) {
    //     let that = this

    //     this.setState({
    //         seconds: seconds
    //     }, () => {
    //         that.countdownInterval = setInterval(() => {
    //             that.state.seconds -= 0.05
    //             if (that.state.seconds <= 0) {
    //                 // clearInterval(that.countdownInterval)
    //                 that.setState({
    //                     // question: undefined,
    //                     seconds: 10
    //                 })
    //             }
    //             else {
    //                 that.setState({
    //                     seconds: that.state.seconds.toFixed(2)
    //                 });
    //             }
    //         }, 100)
    //     })
    // }

    handleChange(event) {
        var o = {}
        o[event.target.id] = event.target.value
        this.setState(o);
    }

    joinRoom(e) {
        e.preventDefault()
        this.sendMessage({
            type: "JOIN_ROOM",
            roomId: this.state.formRoomId.toUpperCase(),
            teamName: this.state.formTeamName,
            error: undefined
        })
        this.setState({
            roomId: this.state.formRoomId.toUpperCase(),
            loading: true
        })
    }

    leaveRoom(event) {
        this.sendMessage({
            type: "LEAVE_ROOM",
            sessionId: this.state.sessionId
        })
        this.setState({
            roomJoined: false,
            error: undefined
        })
    }

    rejoinRoom() {
        this.sendMessage({
            type: "REJOIN_ROOM",
            roomId: this.state.roomId,
            teamId: this.state.teamId,
            sessionId: this.state.sessionId
        })
    }

    answerQuestion(event) {
        this.sendMessage({
            type: "SUBMIT_ANSWER",
            sessionId: this.state.sessionId,
            questionId: this.state.question.questionId,
            answerId: event.target.value,
            teamId: this.state.teamId
        })
        this.setState({
            error: undefined,
            question: undefined
        })
    }

    sendMessage(message) {
        console.log(message.type)
        client.send(JSON.stringify(message, null, 2))
    }

    getFinalResult(win) {
        if (win == true) {
            let winners = [
                "Winner winner chicken dinner!",
                "You won! Try not to be a prick about it.",
                "Nice Googling!",
                "You won, but let's face it... the competition aren't up to much"]
            let i = Math.round(Math.random() * (winners.length - 1))
            return winners[i]
        }
        else {
            let losers = [
                "Game's over, you lost. Loser",
                "You didn't win, but well done you for making everyone else feel smarter.",
                "Game over, and you didn't win. *Sigh*. That must have been tough for you.",
                "Aaaand we're done! Oof, not a brainiac, huh?",
                "Loser loser turnip dinner. That's a thing. Shut up.",
                "You didn't win, but let's do this again without the obvious cheater that won",
                "Sorry, it's not me, it's YOU. You're just a loser! Better luck next time",
                "Mate, do you even Google?",
                "You lost! If you're playing as a couple, I'd take a hard look at each other and really think about your relationship. If you're single, someone already did.",
                "We're done. Christ, why'd you even play?"]
            let i = Math.round(Math.random() * (losers.length - 1))
            return losers[i]
        }
    }

    render() {

        let backgroundColour = 'body { background-color: #000722; text-align: center; }'
        let timer = '.timer { color: white; font-size: 30px; }'
        let container = '.container { text-align: center; padding: 10px 0; }'
        let btnPrimary = '.btn-primary, .btn-primary:focus, .btn-primary[disabled], .btn-primary[disabled]:hover, .btn-primary:not(:disabled):not(.disabled):active { background-color: #ffd949; border-color: #d4ab0a; color: black; text-transform: uppercase; font-weight: bold; }'
        let btnPrimaryDisabled = '.btn-primary[disabled], .btn-primary[disabled]:hover { color: #969696; }'
        let btnPrimaryHover = '.btn-primary:hover { background-color: #ceac2e; border-color: #d4ab0a; color: black; }'
        let questionContainer = '.question-container { color: white; display: grid } .question-container .btn { white-space: normal; margin-top: 35px; font-size: 20px; padding: 10px; }'
        let formContainer = '.form-container { font-size: 20px; color: white; max-width: 500px; }'
        let h1 = ' h1 { text-transform: uppercase; color: white; margin: 40px; }'
        let gameLog = '.game-log { position: absolute; top: 0; right: 0; max-width: 20%; opacity: 50%; }'
        let errorStyle = '.error { color: red; text-transform: uppercase; font-weight: bold; font-size: 20px; padding: 20px; }'

        let styles = <style>{
            [
                backgroundColour,
                timer,
                container,
                h1,
                btnPrimary,
                btnPrimaryDisabled,
                btnPrimaryHover,
                questionContainer,
                formContainer,
                gameLog,
                errorStyle
            ].join('')
        }</style>

        let controls = [styles]

        controls.push(<h1>Quizness Time</h1>)

        if (!this.state.roomJoined) {
            let teamForm =
                <Container className="form-container">
                    <Form onSubmit={e => this.joinRoom(e)}>
                        <Form.Group controlId="formRoomId">
                            <Form.Label>Room Id</Form.Label>
                            <Form.Control type="text" placeholder="ABCD" required={true} minLength="4" maxLength="4" value={this.state.formRoomId} onChange={this.handleChange} style={{ textTransform: 'uppercase' }}>
                            </Form.Control>
                        </Form.Group>
                        <Form.Group controlId="formTeamName">
                            <Form.Label>Team Name</Form.Label>
                            <Form.Control type="text" placeholder="Enter team name" required={true} minLength="4" value={this.state.formTeamName} onChange={this.handleChange} />
                        </Form.Group>
                        <Button disabled={this.state.loading} variant="primary" type="submit">Join Room</Button>
                    </Form>
                </Container >

            controls.push(teamForm)

            if (this.state.roomId != undefined && this.state.sessionId != undefined && this.state.teamId != undefined) {
                controls.push(<Container><Button onClick={this.rejoinRoom}>Rejoin Room '{this.state.roomId}'</Button></Container>)
            }
        }

        if (this.state.roomJoined && this.state.question) {
            // controls.push(<p className="timer"> {this.state.seconds}</p >)
            let question = <Container className='question-container'>
                <h2>{this.state.question.questionText}</h2>
                {this.state.question.answers.map((a) => {
                    return (
                        <Button onClick={this.answerQuestion} value={a.id}>{a.value}</Button>
                    )
                })}
            </Container>

            controls.push(question)
        }

        if (this.state.finalResult != undefined) {
            let finalResult = <Container className='question-container'>
                <h2>{this.state.finalResult}</h2>
            </Container>

            controls.push(finalResult)
        }

        if (this.state.error) {
            let error = <Container className='error'>
                <p>{this.state.error.message}</p>
            </Container>

            controls.push(error)
        }

        // controls.push(
        //     <ListGroup className="game-log">
        //         {this.messages.map((msg) => {
        //             return (
        //                 <ListGroupItem>{msg}</ListGroupItem>
        //             )
        //         })}
        //     </ListGroup>
        // )


        if (this.state.roomJoined) {
            let menuButtons = <Container>
                <Button disabled={!this.state.roomJoined} onClick={this.leaveRoom}>Leave Room</Button>
            </Container>

            controls.push(menuButtons)
        }

        return controls
    }
}

export default PlayerPage;