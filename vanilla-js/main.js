const API_URL = 'http://localhost:3000'; // Backend URL

// SPA: Controla la navegación sin recargar la página
window.addEventListener('hashchange', router);
window.addEventListener('load', router);

// Función para renderizar la página de inicio

async function renderHome() {
  const main = document.getElementById('app');
  main.className = 'main';
  main.innerHTML = `
    <h1>Gestor de Enlaces</h1>
    <form id="add-link-form" class="add-link-form">
      <h3>Agregar Nuevo Enlace</h3>
      <label>Título: <input name="title" required></label><br />
      <label>URL: <input name="url" required></label><br />
      <label>Etiquetas: <input name="tags"></label><br />
      <button type="submit">Agregar</button>
    </form>

    <input type="text" id="filter-tags" placeholder="Filtrar por etiquetas" />
    <button id="filter-button">Filtrar</button>

    <div id="links-list"></div>
  `;

  try {
    let links = await fetch(`${API_URL}/links`).then((res) => res.json());
    displayLinks(links);

    //Filtro sin recargar la página
    document.getElementById('filter-button').addEventListener('click', () => {
      const filterText = document.getElementById('filter-tags').value.trim().toLowerCase();
      const filteredLinks = links.filter(link =>
        link.tags.some(tag => tag.toLowerCase().includes(filterText))
      );
      displayLinks(filteredLinks);
    });

    // Captura la acción del formulario SIN recargar la página
    document.getElementById('add-link-form').addEventListener('submit', async function (event) {
      event.preventDefault(); // Evita recargar la página

      const formData = new FormData(event.target);
      const title = formData.get('title').trim();
      const url = formData.get('url').trim();
      const tags = formData.get('tags').trim().split(',').map(tag => tag.trim());

      if (!title || !url) {
        alert("El título y la URL son obligatorios.");
        return;
      }

      try {
        const response = await fetch(`${API_URL}/links`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, url, tags }),
        });

        if (!response.ok) throw new Error("Error al agregar el enlace.");

        const newLink = await response.json();
        links.unshift(newLink); // Agregar el nuevo enlace a la lista sin recargar
        displayLinks(links);
        event.target.reset(); // Limpia el formulario después de agregar

      } catch (error) {
        console.error("Error al agregar el enlace:", error);
        alert("Error al agregar el enlace. Inténtalo más tarde.");
      }
    });

  } catch (error) {
    console.error('Error al cargar los enlaces:', error);
    main.innerHTML += '<p>Error al cargar los enlaces. Inténtalo más tarde.</p>';
  }
}


// Mostrar los enlaces en la lista
function displayLinks(links) {
  const listContainer = document.getElementById('links-list');
  if (!listContainer) {
    console.error("Error: 'links-list' no encontrado en el DOM.");
    return;
  }

  listContainer.innerHTML = links
    .map(
      (link) => `
      <div class="link-card">
        <button class="botontittle"><a class="titulos" href="#/link/${link._id}">${link.title}</a></button>
        <p>URL: <a href="${link.url}" target="_blank">${link.url}</a></p>
        <p>Etiquetas: ${link.tags.join(', ')}</p>
        <p>Votos: <span id="votes-${link._id}">${link.votes}</span></p>
      </div>`
    )
    .join('');
}

// Router para manejar la navegación SPA
function router() {
  const main = document.getElementById('app');
  const hash = window.location.hash || '#/';
  main.innerHTML = '';

  if (hash === '#/') {
    renderHome();
  } else if (hash.startsWith('#/link/')) {
    const linkId = hash.split('/')[2];
    if (linkId) {
      renderLinkDetail(linkId);
    } else {
      main.innerHTML = '<h2>Error: ID del enlace no válido</h2>';
    }
  } else {
    main.innerHTML = '<h2>Página no encontrada</h2>';
  }
}

// Renderizar detalles de un enlace
async function renderLinkDetail(id) {
  const main = document.getElementById('app');

  try {
    const response = await fetch(`${API_URL}/links/${id}`);
    if (!response.ok) throw new Error('Enlace no encontrado');

    const link = await response.json();

    main.innerHTML = `
      <div class="detalles">
      <h2>${link.title}</h2>
      <p>URL: <a href="${link.url}" target="_blank">${link.url}</a></p>
      <p><strong>Etiquetas:</strong> ${link.tags.join(', ')}</p>
      <p><strong>Votos:</strong> <span id="votes-count">${link.votes}</span></p>
      <button id="upvote">Upvote</button>
      <button id="downvote">Downvote</button>

      <h3>Comentarios</h3>
      <ul id="comments-list"></ul>

      <form id="comment-form">
        <label>Nuevo comentario:</label><br />
        <textarea name="comment" required></textarea><br />
        <button type="submit">Agregar comentario</button>
      </form>
      </div>
    `;

    updateCommentsList(link.comments, id);

    document.getElementById('upvote').addEventListener('click', () => handleVote(id, 1));
    document.getElementById('downvote').addEventListener('click', () => handleVote(id, -1));

    document.getElementById('comment-form').addEventListener('submit', async function (event) {
      event.preventDefault();
      await addComment(id);
    });

  } catch (error) {
    console.error('Error al cargar el enlace:', error);
    main.innerHTML = '<p>Error al cargar el enlace. Inténtalo más tarde.</p>';
  }
}
// Función para manejar votos en tiempo real
async function handleVote(id, value) {
  try {
    const response = await fetch(`${API_URL}/links/${id}/votes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value }),
    });
    if (!response.ok) throw new Error('Error en el voto');
    const updatedLink = await response.json();
    document.getElementById('votes-count').textContent = updatedLink.votes;
  } catch (error) {
    console.error('Error al votar:', error);
  }
}

// Agregar comentario en tiempo real
async function addComment(id) {
  const commentInput = document.querySelector('textarea[name="comment"]');
  const commentText = commentInput.value.trim();

  if (!commentText) {
    alert("El comentario no puede estar vacío.");
    return;
  }

  try {
    const response = await fetch(`${API_URL}/links/${id}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ comment: commentText }),
    });

    if (!response.ok) throw new Error("Error al agregar el comentario.");

    const updatedLink = await response.json();
    commentInput.value = '';
    updateCommentsList(updatedLink.comments, id);

  } catch (error) {
    console.error("Error al agregar comentario:", error);
    alert("Error al agregar comentario. Inténtalo más tarde.");
  }
}

// Eliminar comentario en tiempo real
async function deleteComment(id, index) {
  try {
    const response = await fetch(`${API_URL}/links/${id}/comments/${index}`, {
      method: 'DELETE',
    });

    if (!response.ok) throw new Error("Error al eliminar el comentario.");

    const updatedLink = await response.json();
    updateCommentsList(updatedLink.comments, id);

  } catch (error) {
    console.error('Error al eliminar el comentario:', error);
  }
}

//Función para actualizar la lista de comentarios
function updateCommentsList(comments, id) {
  const commentsList = document.getElementById('comments-list');
  commentsList.innerHTML = '';

  comments.forEach((comment, index) => {
    const commentItem = document.createElement('li');
    commentItem.innerHTML = `
      ${comment}
      <button class="delete-comment" data-index="${index}" data-id="${id}">Eliminar</button>
    `;
    commentsList.appendChild(commentItem);
  });

  document.querySelectorAll('.delete-comment').forEach((button) => {
    button.addEventListener('click', async function () {
      const index = this.dataset.index;
      const linkId = this.dataset.id;
      await deleteComment(linkId, index);
    });
  });
}
