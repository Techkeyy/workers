// Plain vanilla TodoMVC. Data lives in localStorage under STORAGE_KEY as
// an array of { id, title, completed }.
const STORAGE_KEY = 'react-todos';

let todos = loadTodos();
let filter = 'all';
let editingId = null;

const newTodoInput = document.querySelector('.new-todo');
const mainSection = document.querySelector('.main');
const footerSection = document.querySelector('.footer');
const toggleAllInput = document.querySelector('.toggle-all');
const todoListEl = document.querySelector('.todo-list');
const todoCountEl = document.querySelector('.todo-count');
const clearCompletedButton = document.querySelector('.clear-completed');
const filterLinks = document.querySelectorAll('.filters a');

function loadTodos() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch (error) {
    return [];
  }
}

function saveTodos() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
}

function addTodo(title) {
  const cleanTitle = title.trim();
  if (cleanTitle === '') return;
  todos.push({ id: Date.now() + Math.random(), title: cleanTitle, completed: false });
  saveTodos();
  render();
}

function toggleTodo(id) {
  const todo = todos.find((item) => item.id === id);
  todo.completed = !todo.completed;
  saveTodos();
  render();
}

function toggleAll(completed) {
  todos.forEach((todo) => {
    todo.completed = completed;
  });
  saveTodos();
  render();
}

function removeTodo(id) {
  todos = todos.filter((item) => item.id !== id);
  saveTodos();
  render();
}

function clearCompleted() {
  todos = todos.filter((item) => !item.completed);
  saveTodos();
  render();
}

function startEditing(id) {
  editingId = id;
  render();
  const input = todoListEl.querySelector('.edit');
  input.focus();
  input.setSelectionRange(input.value.length, input.value.length);
}

function saveEdit(id, title) {
  if (editingId !== id) return;
  editingId = null;
  const cleanTitle = title.trim();
  if (cleanTitle === '') {
    removeTodo(id);
    return;
  }
  const todo = todos.find((item) => item.id === id);
  todo.title = cleanTitle;
  saveTodos();
  render();
}

function cancelEdit() {
  editingId = null;
  render();
}

function getVisibleTodos() {
  if (filter === 'active') return todos.filter((item) => !item.completed);
  if (filter === 'completed') return todos.filter((item) => item.completed);
  return todos;
}

function createTodoElement(todo) {
  const li = document.createElement('li');
  li.setAttribute('data-testid', 'todo-item');
  const classes = [];
  if (todo.completed) classes.push('completed');
  if (todo.id === editingId) classes.push('editing');
  li.className = classes.join(' ');

  const view = document.createElement('div');
  view.className = 'view';

  const checkbox = document.createElement('input');
  checkbox.className = 'toggle';
  checkbox.type = 'checkbox';
  checkbox.setAttribute('aria-label', 'Toggle Todo');
  checkbox.checked = todo.completed;
  checkbox.addEventListener('change', () => toggleTodo(todo.id));

  const label = document.createElement('label');
  label.setAttribute('data-testid', 'todo-title');
  label.textContent = todo.title;
  label.addEventListener('dblclick', () => startEditing(todo.id));

  const destroy = document.createElement('button');
  destroy.className = 'destroy';
  destroy.setAttribute('aria-label', 'Delete');
  destroy.addEventListener('click', () => removeTodo(todo.id));

  view.append(checkbox, label, destroy);
  li.append(view);

  const editInput = document.createElement('input');
  editInput.className = 'edit';
  editInput.setAttribute('aria-label', 'Edit');
  editInput.value = todo.title;
  editInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') saveEdit(todo.id, editInput.value);
    if (event.key === 'Escape') cancelEdit();
  });
  editInput.addEventListener('blur', () => saveEdit(todo.id, editInput.value));
  li.append(editInput);

  return li;
}

function render() {
  todoListEl.replaceChildren(...getVisibleTodos().map(createTodoElement));

  const activeCount = todos.filter((item) => !item.completed).length;
  const completedCount = todos.length - activeCount;

  mainSection.hidden = todos.length === 0;
  footerSection.hidden = todos.length === 0;
  toggleAllInput.checked = todos.length > 0 && activeCount === 0;
  clearCompletedButton.hidden = completedCount === 0;

  const itemWord = activeCount === 1 ? 'item' : 'items';
  todoCountEl.innerHTML = '<strong>' + activeCount + '</strong> ' + itemWord + ' left';

  filterLinks.forEach((link) => {
    if (link.dataset.filter === filter) {
      link.className = 'selected';
    } else {
      link.removeAttribute('class');
    }
  });
}

function readFilterFromHash() {
  const hash = location.hash.replace('#/', '');
  filter = hash === 'active' || hash === 'completed' ? hash : 'all';
  render();
}

newTodoInput.addEventListener('keydown', (event) => {
  if (event.key !== 'Enter') return;
  addTodo(newTodoInput.value);
  newTodoInput.value = '';
});
toggleAllInput.addEventListener('change', () => toggleAll(toggleAllInput.checked));
clearCompletedButton.addEventListener('click', clearCompleted);
window.addEventListener('hashchange', readFilterFromHash);

readFilterFromHash();
