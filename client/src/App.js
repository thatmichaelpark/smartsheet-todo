/* global socket */
import React, {Component} from 'react';
import './App.css';

class App extends Component {
    constructor() {
        super();
        this.state = {
            todos: [],
            hideCompleted: false,
            input: ''
        };
    }
    componentDidMount() {
        socket.on('refresh', sheet => {
            this.setState({
                todos: sheet.rows
            });
            this.columnIds = [
                sheet.columns[0].id,
                0,
                sheet.columns[2].id
            ];
        });
        socket.on('updateRow', row => {
            const todos = this.state.todos.slice();
            todos[row.rowNumber - 1] = row;
            this.setState({
                todos
            });
        });
        socket.on('deleteRow', rowIds => {
            const newTodos = this.state.todos.filter(todo => rowIds.indexOf(todo.id) === -1);
            this.setState({
                todos: newTodos
            });
        });
        socket.on('addRow', row => {
            const todos = this.state.todos.slice();
            todos.push(row);
            this.setState({
                todos
            });
        });
    }
    componentWillUnmount() {
        socket.off();
    }
    handleDone = (todo) => {
        const doneCell = todo.cells[2];
        doneCell.value = !doneCell.value;
        socket.emit('updateCell', {
            rowId: todo.id,
            columnId: doneCell.columnId,
            value: doneCell.value
        });
    }
    handleDelete = (todo) => {
        socket.emit('deleteRow', todo.id);
    }
    handleInputChange = (e) => {
        this.setState({
            input: e.target.value
        });
    }
    handleAdd = (e) => {
        socket.emit('addRow', [
            {
                columnId: this.columnIds[0],
                value: this.state.input
            },
            {
                columnId: this.columnIds[2],
                value: false
            }
        ]);
        this.setState({
            input: ''
        });
    }
    handleCheckChange = (e) => {
        this.setState({
            hideCompleted: !this.state.hideCompleted
        });
    }
    render() {
        return (
            <div className="todo">
                <h1>To Do</h1>

                {this.state.todos
                    .filter(todo => !this.state.hideCompleted || !todo.cells[2].value)
                    .map(todo =>
                        <div className='row' key={todo.id}>
                            <span
                                style={{
                                    textDecoration: `${todo.cells[2].value ? 'line-through' : ''}`
                                }}
                            >
                                {todo.cells[0].value}
                            </span>
                            <button onClick={() => this.handleDone(todo)}>{todo.cells[2].value ? 'Redo' : 'Done'}</button>
                            <button onClick={() => this.handleDelete(todo)}>Delete</button>
                        </div>
                    )
                }
                <div>
                    New Item:
                    <input onChange={this.handleInputChange} value={this.state.input}/>
                    <button onClick={this.handleAdd}>Add</button>
                </div>
                <div>
                    <input type="checkbox" onChange={this.handleCheckChange} checked={this.state.hideCompleted}/>
                    Hide completed items
                </div>
            </div>
        );
    }
}

export default App;
