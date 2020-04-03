import React from "react"
import { Container, FormGroup } from 'react-bootstrap'

const RoundInputs = (props) => {
    return (
        props.rounds.map((val, idx) => {
            let categoryId = `categoryId-${idx}`, numOfQuestionsId = `numOfQuestions-${idx}`
            return (
                <Container key={idx} className="round-container">
                    <FormGroup>
                        <select
                            name={categoryId}
                            data-id={idx}
                            data-name="categoryId"
                            id={categoryId}
                            value={props.rounds[idx].categoryId}
                            className="categoryId btn btn-primary">
                            {
                                OpenTriviaCategoriesDict.map((obj) => {
                                    return <option value={obj.id}>{obj.name}</option>
                                })
                            }
                        </select>
                        <select
                            name={numOfQuestionsId}
                            data-id={idx}
                            data-name="numOfQuestions"
                            id={numOfQuestionsId}
                            value={props.rounds[idx].numOfQuestions}
                            className="numOfQuestions btn btn-primary">
                            <option value="5">5</option>
                            <option value="10">10</option>
                            <option value="15">15</option>
                            <option value="20">20</option>
                        </select>
                    </FormGroup>
                </Container >
            )
        })
    )
}
export default RoundInputs

const OpenTriviaCategoriesDict = [
    {
        "id": 9,
        "name": "General Knowledge"
    },
    {
        "id": 10,
        "name": "Entertainment: Books"
    },
    {
        "id": 11,
        "name": "Entertainment: Film"
    },
    {
        "id": 12,
        "name": "Entertainment: Music"
    },
    {
        "id": 13,
        "name": "Entertainment: Musicals & Theatres"
    },
    {
        "id": 14,
        "name": "Entertainment: Television"
    },
    {
        "id": 15,
        "name": "Entertainment: Video Games"
    },
    {
        "id": 16,
        "name": "Entertainment: Board Games"
    },
    {
        "id": 17,
        "name": "Science & Nature"
    },
    {
        "id": 18,
        "name": "Science: Computers"
    },
    {
        "id": 19,
        "name": "Science: Mathematics"
    },
    {
        "id": 20,
        "name": "Mythology"
    },
    {
        "id": 21,
        "name": "Sports"
    },
    {
        "id": 22,
        "name": "Geography"
    },
    {
        "id": 23,
        "name": "History"
    },
    {
        "id": 24,
        "name": "Politics"
    },
    {
        "id": 25,
        "name": "Art"
    },
    {
        "id": 26,
        "name": "Celebrities"
    },
    {
        "id": 27,
        "name": "Animals"
    },
    {
        "id": 28,
        "name": "Vehicles"
    },
    {
        "id": 29,
        "name": "Entertainment: Comics"
    },
    {
        "id": 30,
        "name": "Science: Gadgets"
    },
    {
        "id": 31,
        "name": "Entertainment: Japanese Anime & Manga"
    },
    {
        "id": 32,
        "name": "Entertainment: Cartoon & Animations"
    }
]