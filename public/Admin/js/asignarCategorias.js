    // Cargar categorías
    async function cargarCategorias() {
      const res = await fetch('/api/categorias');
      const categorias = await res.json();
      const select = document.getElementById('categorias');
      select.innerHTML = '';
      categorias.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.Id;
        option.textContent = cat.Nombre;
        select.appendChild(option);
      });
    }

    // Cargar asignaciones existentes
    async function cargarAsignaciones() {
      const res = await fetch('/api/asignaciones');
      const data = await res.json();
      const lista = document.getElementById('lista-asignaciones');
      lista.innerHTML = '';
      data.forEach(item => {
        const li = document.createElement('li');
        li.className = 'list-group-item';
        li.textContent = `${item.CocineroNombre} ➝ ${item.CategoriaNombre}`;
        lista.appendChild(li);
      });
    }

    document.getElementById('form-asignacion').addEventListener('submit', async (e) => {
      e.preventDefault();
      const cocinero = document.getElementById('cocinero').value;
      const categorias = Array.from(document.getElementById('categorias').selectedOptions).map(opt => opt.value);

      for (const catId of categorias) {
        await fetch('/api/asignaciones', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cocinero, categoriaId: parseInt(catId) })
        });
      }

      alert('Asignación registrada');
      cargarAsignaciones();
    });

    cargarCategorias();
    cargarAsignaciones();