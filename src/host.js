import React from 'react';
import { Container, Button, Form } from 'react-bootstrap'
import { w3cwebsocket as W3CWebSocket } from "websocket";
import RoundInputs from './components/roundInput'

const RoomIdStorageKey = 'HostRoomId'
const SessionIdStorageKey = 'HostSessionId'

const DefaultCategoryId = "9"
const DefaultNumOfQuestions = "10"

let client = undefined
let heartbeat = undefined

class HostPage extends React.Component {

    constructor(props) {
        super(props);

        this.state = {
            roomCreated: false,
            gameStarted: false,
            gameFinished: false,
            players: [],
            formRounds: [{ categoryId: DefaultCategoryId, numOfQuestions: DefaultNumOfQuestions }],
            isLastQuestion: false,
            loading: false,
            scores: []
        };

        this.messages = []

        this.createRoom = this.createRoom.bind(this);
        this.rejoinRoom = this.rejoinRoom.bind(this);
        this.ping = this.ping.bind(this);
        this.pingAll = this.pingAll.bind(this);
        this.startGame = this.startGame.bind(this);
        this.finishGame = this.finishGame.bind(this);
        this.publishQuestion = this.publishQuestion.bind(this);
    }

    connect() {
        client = new W3CWebSocket('wss://api.quizness-time.com');

        let that = this

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
                case "ROOM_CREATED":
                    this.messages.push(`Room '${event.roomId}' has been created`)
                    this.setState({
                        sessionId: event.sessionId,
                        roomId: event.roomId,
                        roomCreated: true,
                        gameStarted: false,
                        gameFinished: false,
                        loading: false
                    })

                    localStorage.setItem(RoomIdStorageKey, event.roomId)
                    localStorage.setItem(SessionIdStorageKey, event.sessionId)
                    break;
                case "ROOM_HOST_REJOINED":
                    this.messages.push(`Room '${event.roomId}' has been rejoined`)

                    this.setState({
                        sessionId: event.sessionId,
                        roomId: event.roomId,
                        roomCreated: true,
                        players: event.scores.map((player) => {
                            return player
                        }),
                        loading: false
                    })

                    localStorage.setItem(RoomIdStorageKey, event.roomId)
                    localStorage.setItem(SessionIdStorageKey, event.sessionId)
                    break;

                case "ROOM_JOINED":
                    this.messages.push(`Team '${event.teamName}' has joined the room`)
                    this.state.players.push({
                        teamName: event.teamName
                    })
                    this.setState({
                        players: this.state.players
                    })
                    break;
                case "GAME_STARTED":
                    this.messages.push(`Game has started`)
                    this.setState({
                        gameStarted: true,
                        gameFinished: false,
                        loading: false
                    })
                    break;
                case "GAME_FINISHED":
                    this.messages.push(`Game has finished`)
                    if (event.scores != undefined) {
                        this.setState({
                            gameFinished: true,
                            loading: false,
                            scores: event.scores
                        })
                    }
                    break;
                case "QUESTION_PUBLISHED":
                    let answerId = event.question.answerId !== undefined
                        ? ` (AnswerId: ${event.question.answerId})`
                        : 'Uh oh'

                    this.messages.push(`Question published`)

                    this.setState({
                        question: event.question,
                        answer: answerId,
                        isLastQuestion: event.isLastQuestion,
                        lastQuestionNumber: event.questionNumber,
                        lastRoundNumber: event.roundNumber,
                        loading: false
                    })
                    break;
                case "ANSWER_SUBMITTED":
                    this.setState({
                        playersAnswered: this.state.playersAnswered + 1
                    })
                    break;
                case "ERROR":
                    this.setState({
                        error: event,
                        loading: false
                    })
                    break;
                default:
                    this.messages.push(message.data)
                    break;
            }

            this.setState({ lastMessage: message.data });
        };
    }

    componentWillMount() {

        let roomId = localStorage.getItem(RoomIdStorageKey)
        let sessionId = localStorage.getItem(SessionIdStorageKey)

        if (roomId != undefined && sessionId != undefined) {
            this.messages.push(`Recovered room ${roomId}`)
            this.setState({
                roomId: roomId,
                sessionId: sessionId
            })
        }
        else {
            localStorage.clear(RoomIdStorageKey)
            localStorage.clear(SessionIdStorageKey)
        }

        this.connect()
    }

    ping() {
        this.sendMessage({
            type: "PING"
        })
    }

    pingAll() {
        this.sendMessage({
            type: "PING_ALL"
        })
    }

    createRoom(event) {
        event.preventDefault()
        // // Categories: 9-32
        this.sendMessage({
            type: "CREATE_ROOM",
            rounds: this.state.formRounds
        })
    }

    rejoinRoom() {
        this.sendMessage({
            type: "REJOIN_ROOM_HOST",
            roomId: this.state.roomId,
            sessionId: this.state.sessionId
        })
    }

    startGame() {
        this.sendMessage({
            type: "START_GAME",
            sessionId: this.state.sessionId
        })
    }

    finishGame() {
        this.sendMessage({
            type: "FINISH_GAME",
            sessionId: this.state.sessionId
        })
        this.setState({
            question: undefined
        })
    }

    publishQuestion() {
        if (this.state.loading !== true) {
            debugger

            this.sendMessage({
                type: "PUBLISH_NEXT_QUESTION",
                sessionId: this.state.sessionId,
                lastQuestionNumber: this.state.lastQuestionNumber,
                lastRoundNumber: this.state.lastRoundNumber
            })
            this.setState({
                question: undefined,
                loading: true,
                playersAnswered: 0
            })
        }
    }

    sendMessage(message) {
        console.log(message)
        client.send(JSON.stringify(message, null, 2))
    }

    handleChange = (e) => {
        if (["categoryId", "numOfQuestions"].includes(e.target.dataset.name)) {
            let formRounds = [...this.state.formRounds]
            formRounds[e.target.dataset.id][e.target.dataset.name] = e.target.value.toUpperCase()
            this.setState({ formRounds }, () => console.log(this.state.formRounds))
        } else {
            this.setState({ [e.target.name]: e.target.value.toUpperCase() })
        }
    }
    addRound = () => {
        this.setState((prevState) => ({
            formRounds: [...prevState.formRounds, { categoryId: DefaultCategoryId, numOfQuestions: DefaultNumOfQuestions }],
        }));
    }

    render() {

        let backgroundColour = 'body { background-color: #000722; text-align: center; } li { list-style: none; } th {text-align: center; }'
        let container = '.container { text-align: center; padding: 10px}'
        let roomContainer = '.container { color: white; } .container li { font-size: 20px; }'
        let roundContainer = '.container.round-container input { color: black; }'
        let h1 = ' h1 { text-transform: uppercase; color: white; margin: 40px; }'
        let btnPrimary = '.btn-primary, .btn-primary:focus, .btn-primary[disabled], .btn-primary[disabled]:hover, .btn-primary:not(:disabled):not(.disabled):active { background-color: #ffd949; border-color: #d4ab0a; color: black; text-transform: uppercase; font-weight: bold; }'
        let btnPrimaryDisabled = '.btn-primary[disabled], .btn-primary[disabled]:hover { color: #969696; }'
        let btnPrimaryHover = '.btn-primary:hover { background-color: #ceac2e; border-color: #d4ab0a; color: black; }'
        let questionContainer = '.question-container { color: white; display: grid } .question-container p { margin: 10px; font-size: 20px; font-weight: bold; }'
        let scoresTable = '.scores { font-size: 30px; max-width: 500px; text-align: center; margin-left: auto; margin-right: auto; width: 300px;}'
        let gameLog = '.game-log { position: absolute; top: 0; right: 0; max-width: 20%; opacity: 50%; }'

        let styles = <style>{
            [
                backgroundColour,
                h1,
                container,
                roundContainer,
                roomContainer,
                btnPrimary,
                btnPrimaryDisabled,
                btnPrimaryHover,
                questionContainer,
                scoresTable,
                gameLog
            ].join('')
        }</style>

        let controls = [styles]

        controls.push(<h1>Quizness Time</h1>)

        if (this.state.roomCreated) {
            let roomLabel = <Container className='room-container'>
                <h2>Room Id: {this.state.roomId}</h2>
            </Container>
            controls.push(roomLabel)
        }

        if (this.state.roomCreated && !this.state.gameStarted && !this.state.gameFinished) {
            let waitingForPlayers = <Container>
                <table className="scores">
                    <thead>
                        <th>Teams</th>
                    </thead>
                    <tbody>
                        {this.state.players.map((a) => {
                            return (
                                <tr>
                                    <td>{a.teamName}</td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </Container>
            controls.push(waitingForPlayers)
        }

        if (this.state.question) {
            let question = <Container className='question-container'>
                <h2>{this.state.question.questionText}</h2>
                {this.state.question.answers.map((a) => {
                    return (
                        <p>{a.value}</p>
                    )
                })}
                <br />
                <br />
                <h2>{this.state.playersAnswered}/{this.state.players.length} teams answered</h2>
            </Container>

            controls.push(question)
        }

        if (this.state.gameStarted && this.state.gameFinished && this.state.scores != undefined) {
            let scores = <Container className='question-container'>
                <table className="scores">
                    <thead>
                        <th>Team</th>
                        <th>Score</th>
                    </thead>
                    <tbody>
                        {this.state.scores.map((a) => {
                            return (
                                <tr>
                                    <td>{a.teamName}</td>
                                    <td>{a.score}</td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </Container>

            controls.push(scores)
        }

        if (!this.state.roomCreated) {
            let roundsForm =
                <Container>
                    <Form onSubmit={this.createRoom} onChange={this.handleChange} >
                        <RoundInputs rounds={this.state.formRounds} />
                        <Container>
                            <Button onClick={this.addRound}>+</Button>
                        </Container>
                        <Container>
                            <Button variant="primary" type="submit">Create Room</Button>
                        </Container>
                    </Form>
                </Container>
            controls.push(roundsForm)

            if (this.state.roomId && this.state.sessionId) {
                controls.push(<Container>
                    <Button disabled={this.state.roomCreated} onClick={this.rejoinRoom}>Rejoin Room '{this.state.roomId}'</Button>
                </Container>)
            }
        }
        else {
            if (!this.state.gameStarted && this.state.players.length > 0) {
                controls.push(<Container>
                    <Button disabled={!(this.state.roomCreated && !this.state.gameStarted)} onClick={this.startGame}>Start Game</Button>
                </Container>)
            }
            else {
                if (!this.state.isLastQuestion && !this.state.gameFinished) {
                    controls.push(<Container>
                        <Button disabled={this.state.loading} onClick={this.publishQuestion}>Next Question</Button>
                    </Container>)
                }
                else {
                    controls.push(<Container>
                        <Button disabled={!this.state.gameStarted} onClick={this.finishGame}>Get Scores</Button>
                    </Container>)
                }
            }
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

        return controls
    }
}

export default HostPage;