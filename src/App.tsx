import { useState, useEffect } from 'react'
import { 
  LayoutDashboard, ArrowUpCircle, ArrowDownCircle, Users, CreditCard, 
  X, UserPlus, Phone, ChevronLeft, Plus, CheckCircle2,
  Calendar, CreditCard as CardIcon, Download, Trash2, Search, Settings, Edit2, BarChart3
} from 'lucide-react'
import { supabase } from './supabase'
import * as XLSX from 'xlsx'

export default function App() {
  const [vistaActual, setVistaActual] = useState<'INICIO' | 'CLIENTES' | 'PASIVOS' | 'DETALLE_CLIENTE' | 'AJUSTES'>('INICIO')

  // --- ESTADOS DE DATOS ---
  const [categorias, setCategorias] = useState<any[]>([])
  const [patrimonio, setPatrimonio] = useState<number>(0)
  const [ingresosMes, setIngresosMes] = useState<number>(0)
  const [egresosMes, setEgresosMes] = useState<number>(0)
  const [historial, setHistorial] = useState<any[]>([])
  const [resumenCategorias, setResumenCategorias] = useState<any[]>([]) 
  
  const [listaClientes, setListaClientes] = useState<any[]>([])
  const [clienteSeleccionado, setClienteSeleccionado] = useState<any>(null)
  const [busquedaCliente, setBusquedaCliente] = useState<string>('')
  
  const [listaTarjetas, setListaTarjetas] = useState<any[]>([])
  const [listaSuscripciones, setListaSuscripciones] = useState<any[]>([])

  // --- MODALES ---
  const [modalTransaccion, setModalTransaccion] = useState<boolean>(false)
  const [tipoMovimiento, setTipoMovimiento] = useState<'INGRESO' | 'EGRESO'>('INGRESO')
  
  const [modalCliente, setModalCliente] = useState<boolean>(false)
  const [modalDeuda, setModalDeuda] = useState<boolean>(false)
  const [modalAbono, setModalAbono] = useState<boolean>(false)
  const [deudaActiva, setDeudaActiva] = useState<any>(null)
  
  const [modalPasivoNuevo, setModalPasivoNuevo] = useState<boolean>(false)
  const [tipoPasivoNuevo, setTipoPasivoNuevo] = useState<'TARJETA' | 'SUSCRIPCION'>('TARJETA')
  const [, setModalEditarTarjeta] = useState<boolean>(false)
  const [, setModalEditarSuscripcion] = useState<boolean>(false)
  const [tarjetaEditando, setTarjetaEditando] = useState<any>(null)
  const [, setSuscripcionEditando] = useState<any>(null)

  const [modalDeudaTarjeta, setModalDeudaTarjeta] = useState<boolean>(false)
  const [tipoOperacionTarjeta, setTipoOperacionTarjeta] = useState<'SUMAR' | 'RESTAR'>('SUMAR')

  const [modalCategoria, setModalCategoria] = useState<boolean>(false)
  const [tipoCategoriaNueva, setTipoCategoriaNueva] = useState<'INGRESO'|'EGRESO'>('INGRESO')
  const [nombreCategoriaNueva, setNombreCategoriaNueva] = useState<string>('')

  const [modalAnalisis, setModalAnalisis] = useState<boolean>(false)

  // --- FORMULARIOS ---
  const [monto, setMonto] = useState<string>('')
  const [descripcion, setDescripcion] = useState<string>('')
  const [categoriaId, setCategoriaId] = useState<string>('')
  const [nombreNuevo, setNombreNuevo] = useState<string>('')
  const [telNuevo, setTelNuevo] = useState<string>('')
  const [diaCorte, setDiaCorte] = useState<string>('1')
  const [diaPago, setDiaPago] = useState<string>('1')
  const [, setLimiteEditar] = useState<string>('')
  const [, setDiaCorteEditar] = useState<string>('')
  const [, setDiaPagoEditar] = useState<string>('')
  const [fechaFacturacion, setFechaFacturacion] = useState<string>('')
  const [cargando, setCargando] = useState<boolean>(false)

  // --- INICIALIZACIÓN ---
  useEffect(() => { inicializar() }, [])

  const inicializar = async () => {
    await cargarCategorias()
    await cargarTransacciones()
    await calcularMes()
    await cargarClientes()
    await cargarPasivos()
  }

  // ==========================================
  // DASHBOARD Y TRANSACCIONES
  // ==========================================
  const cargarCategorias = async () => {
    const { data } = await supabase.from('categories').select('*')
    if (data) {
      setCategorias(data)
      if (data.length > 0) setCategoriaId(data[0].id)
    }
  }

  const cargarTransacciones = async () => {
    const { data } = await supabase.from('transactions').select('*, categories(subgroup_name, type, group_name)').order('date', { ascending: false }).limit(20)
    if (data) {
      setHistorial(data)
      const total = data.reduce((acc: number, t: any) => t.categories?.type === 'INGRESO' ? acc + Number(t.amount) : acc - Number(t.amount), 0)
      setPatrimonio(total)
    }
  }

  const calcularMes = async () => {
    const inicio = new Date(); inicio.setDate(1); inicio.setHours(0, 0, 0, 0)
    const fin = new Date(); fin.setMonth(fin.getMonth() + 1); fin.setDate(0)
    
    const { data } = await supabase.from('transactions').select('amount, categories(type, subgroup_name)').gte('date', inicio.toISOString()).lte('date', fin.toISOString())
    
    if (data) {
      setIngresosMes(data.filter((t:any) => t.categories?.type === 'INGRESO').reduce((a:number, t:any) => a + Number(t.amount), 0))
      setEgresosMes(data.filter((t:any) => t.categories?.type === 'EGRESO').reduce((a:number, t:any) => a + Number(t.amount), 0))

      const resumen: Record<string, { tipo: string, total: number }> = {}
      data.forEach((t: any) => {
        const cat = t.categories?.subgroup_name || 'Otros'
        if (!resumen[cat]) resumen[cat] = { tipo: t.categories?.type, total: 0 }
        resumen[cat].total += Number(t.amount)
      })
      setResumenCategorias(Object.entries(resumen).map(([nombre, info]) => ({ nombre, ...info })).sort((a,b) => b.total - a.total))
    }
  }

  const guardarTransaccion = async (e: React.FormEvent) => {
    e.preventDefault(); setCargando(true)
    await supabase.from('transactions').insert([{ amount: Number(monto), description: descripcion, category_id: categoriaId, date: new Date().toISOString() }])
    setModalTransaccion(false); setMonto(''); setDescripcion(''); setCargando(false)
    inicializar()
  }

  const eliminarTransaccion = async (id: string) => {
    if (!window.confirm("¿Borrar permanentemente este registro?")) return
    await supabase.from('transactions').delete().eq('id', id)
    inicializar()
  }

  const exportarReporte = async () => {
    const ws = XLSX.utils.json_to_sheet(historial.map(t => ({ Fecha: t.date, Tipo: t.categories?.type, Monto: t.amount, Categoria: t.categories?.subgroup_name, Info: t.description })))
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Finanzas")
    XLSX.writeFile(wb, "Reporte_346.xlsx")
  }

  // ==========================================
  // CONFIGURACIÓN / AJUSTES
  // ==========================================
  const crearCategoria = async (e: React.FormEvent) => {
    e.preventDefault(); setCargando(true)
    await supabase.from('categories').insert([{ type: tipoCategoriaNueva, group_name: tipoCategoriaNueva, subgroup_name: nombreCategoriaNueva }])
    setModalCategoria(false); setNombreCategoriaNueva(''); setCargando(false); cargarCategorias()
  }

  const eliminarCategoria = async (id: string) => {
    if (!window.confirm("¿Borrar categoría? (No debe tener transacciones asociadas)")) return
    await supabase.from('categories').delete().eq('id', id)
    cargarCategorias()
  }

  // ==========================================
  // CLIENTES
  // ==========================================
  const cargarClientes = async () => {
    const { data } = await supabase.from('clients').select('*, debts(*)')
    if (data) {
      setListaClientes(data)
      if (clienteSeleccionado) setClienteSeleccionado(data.find((c: any) => c.id === clienteSeleccionado?.id))
    }
  }

  const crearCliente = async (e: React.FormEvent) => {
    e.preventDefault(); setCargando(true)
    await supabase.from('clients').insert([{ name: nombreNuevo, phone: telNuevo }])
    setModalCliente(false); setNombreNuevo(''); setTelNuevo(''); setCargando(false); cargarClientes()
  }

  const eliminarCliente = async (id: string) => {
    if (!window.confirm("¿Borrar cliente y todo su historial de deudas?")) return
    await supabase.from('clients').delete().eq('id', id)
    setVistaActual('CLIENTES'); cargarClientes()
  }

  const guardarDeuda = async (e: React.FormEvent) => {
    e.preventDefault(); setCargando(true)
    await supabase.from('debts').insert([{ client_id: clienteSeleccionado?.id, concept: descripcion, total_amount: Number(monto) }])
    setModalDeuda(false); setMonto(''); setDescripcion(''); setCargando(false); cargarClientes()
  }

  const guardarAbono = async (e: React.FormEvent) => {
    e.preventDefault(); setCargando(true)
    const abono = Number(monto)
    const nuevoPago = Number(deudaActiva?.paid_amount || 0) + abono
    await supabase.from('debts').update({ paid_amount: nuevoPago, status: nuevoPago >= Number(deudaActiva?.total_amount || 0) ? 'PAGADO' : 'PENDIENTE' }).eq('id', deudaActiva?.id)
    
    const catIngreso = categorias.find(c => c.type === 'INGRESO')
    await supabase.from('transactions').insert([{ amount: abono, description: `Abono CxC: ${clienteSeleccionado?.name}`, category_id: catIngreso?.id, date: new Date().toISOString() }])
    
    setModalAbono(false); setMonto(''); setCargando(false); inicializar()
  }

  const clientesFiltrados = listaClientes.filter(c => c.name.toLowerCase().includes(busquedaCliente.toLowerCase()))

  // ==========================================
  // PASIVOS Y TARJETAS EN VIVO
  // ==========================================
  const cargarPasivos = async () => {
    const { data: t } = await supabase.from('credit_cards').select('*')
    const { data: s } = await supabase.from('subscriptions').select('*')
    if (t) setListaTarjetas(t); if (s) setListaSuscripciones(s)
  }

  const crearPasivo = async (e: React.FormEvent) => {
    e.preventDefault(); setCargando(true)
    if (tipoPasivoNuevo === 'TARJETA') {
      await supabase.from('credit_cards').insert([{ name: nombreNuevo, limit_amount: Number(monto), cutoff_day: Number(diaCorte), payment_day: Number(diaPago), current_debt: 0 }])
    } else {
      await supabase.from('subscriptions').insert([{ name: nombreNuevo, amount: Number(monto), billing_day: Number(diaCorte), billing_date: fechaFacturacion || null }])
    }
    setModalPasivoNuevo(false); setNombreNuevo(''); setMonto(''); setFechaFacturacion(''); setCargando(false); cargarPasivos()
  }

  const abrirEditarTarjeta = (t: any) => {
    setTarjetaEditando(t); setLimiteEditar(String(t.limit_amount)); setDiaCorteEditar(String(t.cutoff_day)); setDiaPagoEditar(String(t.payment_day)); setModalEditarTarjeta(true)
  }
  const eliminarTarjeta = async (id: string) => {
    if (!window.confirm('¿Eliminar tarjeta?')) return
    await supabase.from('credit_cards').delete().eq('id', id); cargarPasivos()
  }

  const abrirEditarSuscripcion = (s: any) => {
    setSuscripcionEditando(s); setDiaCorteEditar(String(s.billing_day)); setFechaFacturacion(s.billing_date || ''); setMonto(String(s.amount)); setModalEditarSuscripcion(true)
  }
  const eliminarSuscripcion = async (id: string) => {
    if (!window.confirm('¿Eliminar suscripción?')) return
    await supabase.from('subscriptions').delete().eq('id', id); cargarPasivos()
  }

  // --- Lógica Sumar/Restar Deuda Tarjeta ---
  const abrirModificarDeuda = (t: any, tipo: 'SUMAR' | 'RESTAR') => {
    setTarjetaEditando(t); setTipoOperacionTarjeta(tipo); setMonto(''); setModalDeudaTarjeta(true)
  }

  const procesarDeudaTarjeta = async (e: React.FormEvent) => {
    e.preventDefault(); setCargando(true)
    const montoNum = Number(monto)
    let nuevaDeuda = Number(tarjetaEditando?.current_debt || 0)
    
    if (tipoOperacionTarjeta === 'SUMAR') {
      nuevaDeuda += montoNum
    } else {
      nuevaDeuda -= montoNum
      if (nuevaDeuda < 0) nuevaDeuda = 0
    }

    if (tipoOperacionTarjeta === 'RESTAR') {
      const catEgreso = categorias.find(c => c.type === 'EGRESO')
      await supabase.from('transactions').insert([{ amount: montoNum, description: `Pago Tarjeta: ${tarjetaEditando?.name}`, category_id: catEgreso?.id, date: new Date().toISOString() }])
    }

    await supabase.from('credit_cards').update({ current_debt: nuevaDeuda }).eq('id', tarjetaEditando?.id)
    setModalDeudaTarjeta(false); setMonto(''); setTarjetaEditando(null); setCargando(false); inicializar()
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-28 font-sans">
      
      {/* HEADER GLOBAL CON ANÁLISIS RÁPIDO */}
      <header className="bg-white px-6 pt-10 pb-4 sticky top-0 z-20 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          {vistaActual === 'DETALLE_CLIENTE' && <button onClick={() => setVistaActual('CLIENTES')} className="p-2 -ml-2 text-gray-500 rounded-full"><ChevronLeft size={24} /></button>}
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">
              {vistaActual === 'INICIO' ? '346 TECH' : vistaActual === 'CLIENTES' ? 'Clientes' : vistaActual === 'PASIVOS' ? 'Pasivos' : vistaActual === 'AJUSTES' ? 'Ajustes' : clienteSeleccionado?.name}
            </h1>
            <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">
              {vistaActual === 'DETALLE_CLIENTE' ? 'Perfil de Cliente' : new Date().toLocaleDateString('es-DO', { month: 'long', day: 'numeric' })}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {vistaActual === 'INICIO' && (
            <>
              <button onClick={() => setModalAnalisis(true)} className="p-3 bg-blue-50 text-blue-600 rounded-2xl active:scale-95 transition-transform"><BarChart3 size={20}/></button>
              <button onClick={exportarReporte} className="p-3 bg-blue-50 text-blue-600 rounded-2xl active:scale-95 transition-transform"><Download size={20}/></button>
              <button onClick={() => setVistaActual('AJUSTES')} className="p-3 bg-gray-100 text-gray-600 rounded-2xl active:scale-95 transition-transform"><Settings size={20}/></button>
            </>
          )}
        </div>
      </header>

      {/* VISTA INICIO */}
      {vistaActual === 'INICIO' && (
        <main className="p-6 space-y-6 animate-in fade-in">
          
          <div className="bg-blue-900 rounded-[2.5rem] p-8 text-white shadow-xl relative overflow-hidden">
            <div className="absolute -right-8 -top-8 w-40 h-40 bg-blue-800 rounded-full opacity-40" />
            <div className="absolute -right-4 -bottom-10 w-32 h-32 bg-blue-700 rounded-full opacity-30" />
            <h2 className="text-blue-300 text-[10px] font-bold uppercase mb-1 relative">Caja Disponible</h2>
            <p className="text-4xl font-black relative">${patrimonio.toLocaleString()}</p>
            <div className="flex gap-6 mt-4 relative">
              <div>
                <p className="text-[9px] text-green-300 font-bold uppercase">↑ Ingresos mes</p>
                <p className="text-sm font-black text-green-300">+${ingresosMes.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[9px] text-red-300 font-bold uppercase">↓ Egresos mes</p>
                <p className="text-sm font-black text-red-300">-${egresosMes.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button onClick={() => { setTipoMovimiento('INGRESO'); setMonto(''); setDescripcion(''); setModalTransaccion(true) }} className="bg-white p-6 rounded-3xl border border-gray-100 flex flex-col items-center gap-2 shadow-sm active:scale-95 transition-all">
              <div className="bg-green-100 p-3 rounded-2xl text-green-600"><ArrowUpCircle /></div>
              <span className="font-bold text-xs text-gray-800">Ingreso</span>
            </button>
            <button onClick={() => { setTipoMovimiento('EGRESO'); setMonto(''); setDescripcion(''); setModalTransaccion(true) }} className="bg-white p-6 rounded-3xl border border-gray-100 flex flex-col items-center gap-2 shadow-sm active:scale-95 transition-all">
              <div className="bg-red-100 p-3 rounded-2xl text-red-600"><ArrowDownCircle /></div>
              <span className="font-bold text-xs text-gray-800">Egreso</span>
            </button>
          </div>

          <section className="space-y-4 pb-10">
            <h3 className="font-black text-gray-900 px-1">Historial Reciente</h3>
            <div className="bg-white rounded-[2rem] border border-gray-100 overflow-hidden shadow-sm">
              {historial.map((t: any) => (
                <div key={t.id} className="p-4 border-b border-gray-50 flex justify-between items-center last:border-0">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className={t.categories?.type === 'INGRESO' ? 'text-green-500' : 'text-red-500'}>{t.categories?.type === 'INGRESO' ? <ArrowUpCircle size={18}/> : <ArrowDownCircle size={18}/>}</div>
                    <div className="truncate">
                      <p className="text-sm font-bold text-gray-800 truncate">{t.description || t.categories?.subgroup_name}</p>
                      <p className="text-[10px] text-gray-400 font-bold uppercase">{t.categories?.subgroup_name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`font-black text-sm ${t.categories?.type === 'INGRESO' ? 'text-green-600' : 'text-red-600'}`}>{t.categories?.type === 'INGRESO' ? '+' : '-'}${Number(t.amount).toLocaleString()}</span>
                    <button onClick={() => eliminarTransaccion(t.id)} className="text-gray-300 hover:text-red-500"><Trash2 size={16}/></button>
                  </div>
                </div>
              ))}
              {historial.length === 0 && <p className="p-6 text-center text-sm text-gray-400 font-bold">Sin transacciones</p>}
            </div>
          </section>
        </main>
      )}

      {/* VISTA CLIENTES */}
      {vistaActual === 'CLIENTES' && (
        <main className="p-6 space-y-6 animate-in fade-in">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-4 text-gray-400" size={18}/>
              <input type="text" value={busquedaCliente} onChange={(e)=>setBusquedaCliente(e.target.value)} placeholder="Buscar cliente..." className="w-full bg-white border border-gray-100 rounded-2xl p-4 pl-12 text-sm font-bold outline-none focus:border-blue-300"/>
            </div>
            <button onClick={()=>{setNombreNuevo(''); setTelNuevo(''); setModalCliente(true)}} className="bg-blue-900 text-white p-4 rounded-2xl shadow-lg active:scale-95"><UserPlus size={20}/></button>
          </div>
          <div className="space-y-3">
            {clientesFiltrados.map((c: any) => {
              const deudaTotal = c.debts?.reduce((acc: number, d: any) => d.status === 'PENDIENTE' ? acc + (Number(d.total_amount) - Number(d.paid_amount)) : acc, 0) || 0
              return (
                <div key={c.id} onClick={()=>{setClienteSeleccionado(c); setVistaActual('DETALLE_CLIENTE')}} className="bg-white p-5 rounded-[2rem] border border-gray-100 flex justify-between items-center cursor-pointer hover:shadow-md active:scale-95 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center font-black text-lg">{c.name.charAt(0).toUpperCase()}</div>
                    <div>
                      <h4 className="font-black text-gray-900">{c.name}</h4>
                      <p className="text-xs text-gray-400 font-bold mt-1 flex items-center gap-1"><Phone size={10}/>{c.phone || 'Sin Teléfono'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-gray-400 font-bold uppercase">Debe</p>
                    <p className={`font-black text-lg ${deudaTotal > 0 ? 'text-red-500' : 'text-green-500'}`}>${deudaTotal.toLocaleString()}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </main>
      )}

      {/* VISTA DETALLE CLIENTE */}
      {vistaActual === 'DETALLE_CLIENTE' && clienteSeleccionado && (
        <main className="p-6 space-y-6 animate-in slide-in-from-right-8">
          <div className="flex gap-2">
            <button onClick={() => {setMonto(''); setDescripcion(''); setModalDeuda(true)}} className="flex-1 bg-blue-900 text-white p-4 rounded-2xl font-bold flex items-center justify-center gap-2 active:scale-95"><Plus size={18}/> Nueva Deuda</button>
            <button onClick={() => eliminarCliente(clienteSeleccionado?.id)} className="p-4 bg-red-50 text-red-500 rounded-2xl active:scale-95"><Trash2 size={18}/></button>
          </div>
          
          <div className="space-y-3 pb-10">
            <h3 className="font-black text-gray-900">Historial de Cuentas</h3>
            {[...(clienteSeleccionado?.debts || [])].sort((a) => a.status === 'PENDIENTE' ? -1 : 1).map((deuda: any) => {
              const pendiente = Number(deuda.total_amount) - Number(deuda.paid_amount)
              return (
                <div key={deuda.id} className={`bg-white p-5 rounded-[2rem] border ${deuda.status === 'PAGADO' ? 'border-green-100 opacity-60' : 'border-gray-100 shadow-sm'}`}>
                  <div className="flex justify-between mb-3">
                    <div><p className="font-bold text-gray-900">{deuda.concept}</p><p className="text-xs text-gray-400 font-bold">Total: ${Number(deuda.total_amount).toLocaleString()}</p></div>
                    {deuda.status === 'PAGADO' ? <span className="bg-green-50 text-green-600 px-2 py-1 rounded-lg text-[10px] font-black flex items-center gap-1"><CheckCircle2 size={12}/> PAGADO</span> : <span className="bg-orange-50 text-orange-600 px-2 py-1 rounded-lg text-[10px] font-black">PENDIENTE</span>}
                  </div>
                  {deuda.status !== 'PAGADO' && (
                    <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                      <div><p className="text-[10px] text-gray-400 font-bold uppercase">Resta</p><p className="text-xl font-black text-red-500">${pendiente.toLocaleString()}</p></div>
                      <button onClick={() => { setDeudaActiva(deuda); setMonto(''); setModalAbono(true) }} className="bg-gray-900 text-white text-xs font-bold px-5 py-2 rounded-xl active:scale-95">Abonar</button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </main>
      )}

      {/* VISTA PASIVOS */}
      {vistaActual === 'PASIVOS' && (
        <main className="p-6 space-y-8 animate-in fade-in">
          <button onClick={()=>{setTipoPasivoNuevo('TARJETA'); setNombreNuevo(''); setMonto(''); setDiaCorte('1'); setDiaPago('1'); setFechaFacturacion(''); setModalPasivoNuevo(true)}} className="w-full p-4 bg-blue-50 text-blue-700 rounded-2xl font-bold border border-blue-100 border-dashed flex items-center justify-center gap-2 active:scale-95">
            <Plus size={18}/> Agregar Tarjeta o Servicio
          </button>
          
          <section className="space-y-4">
            <h3 className="font-black text-gray-900 flex items-center gap-2 px-1"><CardIcon size={18}/> Tarjetas</h3>
            {listaTarjetas.map(t => (
              <div key={t.id} className="bg-white p-5 rounded-[2rem] border border-gray-100 flex flex-col gap-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-black text-gray-800">{t.name}</h4>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Corte: día {t.cutoff_day} | Pago: día {t.payment_day}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={()=>abrirEditarTarjeta(t)} className="p-2 text-blue-600 bg-blue-50 rounded-xl"><Edit2 size={16}/></button>
                    <button onClick={()=>eliminarTarjeta(t.id)} className="p-2 text-red-500 bg-red-50 rounded-xl"><Trash2 size={16}/></button>
                  </div>
                </div>
                
                <div className="flex flex-col gap-3 bg-gray-50 p-4 rounded-2xl">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase">Deuda Actual</p>
                      <p className={`font-black text-xl ${Number(t.current_debt)>0 ? 'text-red-500':'text-gray-900'}`}>${Number(t.current_debt || 0).toLocaleString()}</p>
                    </div>
                    {Number(t.current_debt)>0 && (
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-gray-400 uppercase">Pago Mínimo (5%)</p>
                        <p className="font-black text-orange-500">${(Number(t.current_debt || 0) * 0.05).toLocaleString()}</p>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 w-full pt-2 border-t border-gray-200">
                    <button onClick={()=>abrirModificarDeuda(t, 'SUMAR')} className="flex-1 bg-red-100 text-red-700 text-xs font-bold py-2 rounded-xl active:scale-95 flex justify-center items-center gap-1"><ArrowUpCircle size={14}/> Usar</button>
                    <button onClick={()=>abrirModificarDeuda(t, 'RESTAR')} disabled={Number(t.current_debt || 0) === 0} className={`flex-1 text-xs font-bold py-2 rounded-xl flex justify-center items-center gap-1 ${Number(t.current_debt || 0) === 0 ? 'bg-gray-100 text-gray-400' : 'bg-green-100 text-green-700 active:scale-95'}`}><ArrowDownCircle size={14}/> Pagar</button>
                  </div>
                </div>
              </div>
            ))}
          </section>

          <section className="space-y-4 pb-10">
            <h3 className="font-black text-gray-900 flex items-center gap-2 px-1"><Calendar size={18}/> Suscripciones</h3>
            <div className="grid grid-cols-2 gap-3">
              {listaSuscripciones.map(s => (
                <div key={s.id} className="p-4 rounded-3xl border bg-white border-gray-100 shadow-sm flex flex-col justify-between">
                  <div className="flex justify-between items-start mb-2">
                    <p className="font-bold text-gray-900 text-sm truncate pr-2">{s.name}</p>
                    <button onClick={()=>abrirEditarSuscripcion(s)} className="text-gray-400"><Edit2 size={14}/></button>
                  </div>
                  <div>
                     <p className="font-black text-blue-600 text-lg">${Number(s.amount || 0).toLocaleString()}</p>
                     <p className="text-[10px] text-gray-400 font-bold">Día cobro: {s.billing_day}</p>
                  </div>
                  <button onClick={()=>eliminarSuscripcion(s.id)} className="mt-3 p-2 bg-red-50 text-red-500 rounded-xl flex justify-center"><Trash2 size={14}/></button>
                </div>
              ))}
            </div>
          </section>
        </main>
      )}

      {/* VISTA AJUSTES (CONFIGURACIÓN DE CATEGORÍAS) */}
      {vistaActual === 'AJUSTES' && (
        <main className="p-6 space-y-6 animate-in slide-in-from-right-8">
          <div className="bg-blue-50 p-6 rounded-3xl">
            <h3 className="font-black text-blue-900 mb-2">Tus Categorías</h3>
            <p className="text-xs text-blue-700">Añade o elimina etiquetas para clasificar mejor tus movimientos.</p>
          </div>
          <button onClick={()=>{setNombreCategoriaNueva(''); setTipoCategoriaNueva('INGRESO'); setModalCategoria(true)}} className="w-full bg-gray-900 text-white p-4 rounded-2xl font-bold flex items-center justify-center gap-2 active:scale-95"><Plus size={18}/> Crear Categoría</button>
          
          <div className="space-y-4 pb-10">
            <div>
              <h4 className="font-black text-green-600 mb-2 px-1">Ingresos</h4>
              <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
                {categorias.filter(c => c.type === 'INGRESO').map(c => (
                  <div key={c.id} className="p-4 border-b border-gray-50 flex justify-between items-center last:border-0">
                     <span className="font-bold text-sm text-gray-700">{c.subgroup_name}</span>
                     <button onClick={()=>eliminarCategoria(c.id)} className="text-gray-300 hover:text-red-500"><Trash2 size={16}/></button>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h4 className="font-black text-red-600 mb-2 px-1">Egresos</h4>
              <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
                {categorias.filter(c => c.type === 'EGRESO').map(c => (
                  <div key={c.id} className="p-4 border-b border-gray-50 flex justify-between items-center last:border-0">
                     <span className="font-bold text-sm text-gray-700">{c.subgroup_name}</span>
                     <button onClick={()=>eliminarCategoria(c.id)} className="text-gray-300 hover:text-red-500"><Trash2 size={16}/></button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      )}

      {/* ==========================================
          MODALES
      ========================================== */}
      
      {/* 1. Transacción */}
      {modalTransaccion && (
         <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm p-4">
           <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl animate-in slide-in-from-bottom-10">
            <div className="flex justify-between items-center mb-6"><h3 className={`text-2xl font-black ${tipoMovimiento === 'INGRESO' ? 'text-green-600' : 'text-red-600'}`}>Nuevo {tipoMovimiento}</h3><button type="button" onClick={() => setModalTransaccion(false)} className="p-2 bg-gray-100 rounded-full"><X size={20}/></button></div>
            <form onSubmit={guardarTransaccion} className="space-y-6">
              <input type="number" step="0.01" value={monto} onChange={(e)=>setMonto(e.target.value)} placeholder="0.00" autoFocus required className="w-full text-5xl font-black text-gray-900 bg-transparent border-none text-center outline-none"/>
              <select value={categoriaId} onChange={(e)=>setCategoriaId(e.target.value)} className="w-full bg-gray-50 p-4 rounded-2xl border-none font-bold text-gray-600 outline-none">{categorias.filter(c => c.type === tipoMovimiento).map(cat => (<option key={cat.id} value={cat.id}>{cat.subgroup_name}</option>))}</select>
              <input type="text" value={descripcion} onChange={(e)=>setDescripcion(e.target.value)} placeholder="Descripción (opcional)" className="w-full bg-gray-50 p-4 rounded-2xl border-none font-bold text-center outline-none"/>
              <button type="submit" disabled={cargando} className={`w-full py-5 rounded-2xl text-white font-black text-xl active:scale-95 transition-all ${tipoMovimiento==='INGRESO'?'bg-green-600':'bg-red-600'}`}>{cargando?'Guardando...':'Confirmar'}</button>
            </form>
          </div>
        </div>
      )}

      {/* 2. Modal Crear Cliente */}
      {modalCliente && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-6">
          <form onSubmit={crearCliente} className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 space-y-4 animate-in zoom-in-95">
            <h3 className="text-xl font-black text-gray-900">Nuevo Cliente</h3>
            <input type="text" value={nombreNuevo} onChange={(e)=>setNombreNuevo(e.target.value)} placeholder="Nombre completo" required className="w-full bg-gray-50 p-4 rounded-2xl border-none font-bold outline-none"/>
            <input type="tel" value={telNuevo} onChange={(e)=>setTelNuevo(e.target.value)} placeholder="Teléfono" className="w-full bg-gray-50 p-4 rounded-2xl border-none font-bold outline-none"/>
            <div className="flex gap-2 pt-2"><button type="button" onClick={()=>setModalCliente(false)} className="flex-1 p-4 font-bold text-gray-400">Cancelar</button><button type="submit" disabled={cargando} className="flex-1 bg-blue-900 text-white p-4 rounded-2xl font-bold">Guardar</button></div>
          </form>
        </div>
      )}

      {/* 3. Modal Deuda */}
      {modalDeuda && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-6">
          <form onSubmit={guardarDeuda} className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 space-y-4 animate-in zoom-in-95">
            <h3 className="text-xl font-black text-blue-900">Registrar Deuda</h3>
            <input type="text" value={descripcion} onChange={(e)=>setDescripcion(e.target.value)} placeholder="Concepto (ej. Reparación)" required className="w-full bg-gray-50 p-4 rounded-2xl border-none font-bold outline-none text-center" autoFocus/>
            <input type="number" step="0.01" value={monto} onChange={(e)=>setMonto(e.target.value)} placeholder="Monto Total" required className="w-full text-4xl font-black text-gray-900 bg-transparent border-none text-center outline-none"/>
            <div className="flex gap-2 pt-2"><button type="button" onClick={()=>setModalDeuda(false)} className="flex-1 p-4 font-bold text-gray-400">Cancelar</button><button type="submit" disabled={cargando} className="flex-1 bg-blue-900 text-white p-4 rounded-2xl font-bold">Guardar</button></div>
          </form>
        </div>
      )}

      {/* 4. Modal Abono */}
      {modalAbono && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-6">
          <form onSubmit={guardarAbono} className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 space-y-4 animate-in zoom-in-95">
            <h3 className="text-xl font-black text-green-600 text-center">Recibir Abono</h3>
            <div className="text-center bg-gray-50 p-4 rounded-2xl"><p className="text-[10px] text-gray-400 font-bold uppercase">Resta de: {deudaActiva?.concept}</p><p className="text-3xl font-black text-red-500">${(Number(deudaActiva?.total_amount || 0) - Number(deudaActiva?.paid_amount || 0)).toLocaleString()}</p></div>
            <input type="number" step="0.01" max={Number(deudaActiva?.total_amount || 0) - Number(deudaActiva?.paid_amount || 0)} value={monto} onChange={(e)=>setMonto(e.target.value)} placeholder="0.00" required autoFocus className="w-full text-5xl font-black text-green-600 bg-transparent border-none text-center outline-none"/>
            <div className="flex gap-2 pt-2"><button type="button" onClick={()=>setModalAbono(false)} className="flex-1 p-4 font-bold text-gray-400">Cancelar</button><button type="submit" disabled={cargando} className="flex-1 bg-green-600 text-white p-4 rounded-2xl font-bold">Confirmar</button></div>
          </form>
        </div>
      )}

      {/* 5. Modal Crear Pasivo */}
      {modalPasivoNuevo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-6">
          <form onSubmit={crearPasivo} className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 space-y-4 animate-in zoom-in-95">
            <h3 className="text-xl font-black text-gray-900">Nuevo Pasivo</h3>
            <div className="flex bg-gray-100 p-1 rounded-xl">
              <button type="button" onClick={()=>setTipoPasivoNuevo('TARJETA')} className={`flex-1 py-2 text-xs font-bold rounded-lg ${tipoPasivoNuevo==='TARJETA'?'bg-white shadow-sm text-blue-900':'text-gray-500'}`}>Tarjeta</button>
              <button type="button" onClick={()=>setTipoPasivoNuevo('SUSCRIPCION')} className={`flex-1 py-2 text-xs font-bold rounded-lg ${tipoPasivoNuevo==='SUSCRIPCION'?'bg-white shadow-sm text-blue-900':'text-gray-500'}`}>Servicio</button>
            </div>
            <input type="text" value={nombreNuevo} onChange={(e)=>setNombreNuevo(e.target.value)} placeholder="Nombre (ej. Visa)" required className="w-full bg-gray-50 p-4 rounded-2xl border-none font-bold outline-none text-center"/>
            <input type="number" step="0.01" value={monto} onChange={(e)=>setMonto(e.target.value)} placeholder={tipoPasivoNuevo==='TARJETA'?'Límite de crédito':'Costo Mensual'} required className="w-full text-3xl font-black text-gray-900 bg-transparent border-none text-center outline-none"/>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1 text-center"><label className="text-[10px] font-bold text-gray-400 uppercase">{tipoPasivoNuevo==='TARJETA'?'Día Corte':'Día Cobro'}</label><input type="number" min="1" max="31" value={diaCorte} onChange={(e)=>setDiaCorte(e.target.value)} required className="w-full bg-gray-50 p-4 rounded-2xl border-none font-black text-center outline-none"/></div>
              {tipoPasivoNuevo === 'TARJETA' && <div className="space-y-1 text-center"><label className="text-[10px] font-bold text-gray-400 uppercase">Día Pago</label><input type="number" min="1" max="31" value={diaPago} onChange={(e)=>setDiaPago(e.target.value)} required className="w-full bg-gray-50 p-4 rounded-2xl border-none font-black text-center outline-none"/></div>}
            </div>
            <div className="flex gap-2 pt-2"><button type="button" onClick={()=>setModalPasivoNuevo(false)} className="flex-1 p-4 font-bold text-gray-400">Cancelar</button><button type="submit" disabled={cargando} className="flex-1 bg-gray-900 text-white p-4 rounded-2xl font-bold">Guardar</button></div>
          </form>
        </div>
      )}

      {/* 6. Modal Modificar Deuda de Tarjeta (EN VIVO) */}
      {modalDeudaTarjeta && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-6">
          <form onSubmit={procesarDeudaTarjeta} className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 space-y-4 animate-in zoom-in-95">
            <h3 className={`text-xl font-black text-center ${tipoOperacionTarjeta === 'SUMAR' ? 'text-red-600' : 'text-green-600'}`}>
              {tipoOperacionTarjeta === 'SUMAR' ? 'Registrar Consumo' : 'Abonar a Tarjeta'}
            </h3>
            <div className="text-center bg-gray-50 p-4 rounded-2xl">
              <p className="text-[10px] text-gray-400 font-bold uppercase">Deuda de {tarjetaEditando?.name}</p>
              <p className="text-3xl font-black text-gray-900">${Number(tarjetaEditando?.current_debt || 0).toLocaleString()}</p>
            </div>
            <input type="number" step="0.01" value={monto} onChange={(e)=>setMonto(e.target.value)} placeholder="0.00" required autoFocus className={`w-full text-5xl font-black bg-transparent border-none text-center outline-none ${tipoOperacionTarjeta === 'SUMAR' ? 'text-red-600' : 'text-green-600'}`}/>
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={()=>setModalDeudaTarjeta(false)} className="flex-1 p-4 font-bold text-gray-400">Cancelar</button>
              <button type="submit" disabled={cargando} className={`flex-1 text-white p-4 rounded-2xl font-bold ${tipoOperacionTarjeta === 'SUMAR' ? 'bg-red-600' : 'bg-green-600'}`}>Confirmar</button>
            </div>
          </form>
        </div>
      )}

      {/* 7. Modal Crear Categoría (AJUSTES) */}
      {modalCategoria && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-6">
          <form onSubmit={crearCategoria} className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 space-y-4 animate-in zoom-in-95">
            <h3 className="text-xl font-black text-gray-900">Nueva Categoría</h3>
            <div className="flex bg-gray-100 p-1 rounded-xl">
              <button type="button" onClick={()=>setTipoCategoriaNueva('INGRESO')} className={`flex-1 py-2 text-xs font-bold rounded-lg ${tipoCategoriaNueva==='INGRESO'?'bg-white shadow-sm text-green-600':'text-gray-500'}`}>Ingreso</button>
              <button type="button" onClick={()=>setTipoCategoriaNueva('EGRESO')} className={`flex-1 py-2 text-xs font-bold rounded-lg ${tipoCategoriaNueva==='EGRESO'?'bg-white shadow-sm text-red-600':'text-gray-500'}`}>Egreso</button>
            </div>
            <input type="text" value={nombreCategoriaNueva} onChange={(e)=>setNombreCategoriaNueva(e.target.value)} placeholder="Nombre (ej. Comida)" required autoFocus className="w-full bg-gray-50 p-4 rounded-2xl border-none font-bold outline-none text-center"/>
            <div className="flex gap-2 pt-2"><button type="button" onClick={()=>setModalCategoria(false)} className="flex-1 p-4 font-bold text-gray-400">Cancelar</button><button type="submit" disabled={cargando} className="flex-1 bg-blue-900 text-white p-4 rounded-2xl font-bold">Guardar</button></div>
          </form>
        </div>
      )}

      {/* 8. Modal Análisis Rápido */}
      {modalAnalisis && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-6">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in-95 max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-black text-gray-900">Análisis del Mes</h3>
              <button onClick={() => setModalAnalisis(false)} className="p-2 bg-gray-100 rounded-full active:scale-95 transition-transform"><X size={20}/></button>
            </div>
            
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="bg-green-50 p-4 rounded-2xl border border-green-100 shadow-sm">
                <p className="text-[10px] font-bold text-green-600 uppercase">Total Ingresos</p>
                <p className="text-xl font-black text-green-700">${ingresosMes.toLocaleString()}</p>
              </div>
              <div className="bg-red-50 p-4 rounded-2xl border border-red-100 shadow-sm">
                <p className="text-[10px] font-bold text-red-600 uppercase">Total Egresos</p>
                <p className="text-xl font-black text-red-700">${egresosMes.toLocaleString()}</p>
              </div>
            </div>

            <div className={`p-4 rounded-2xl mb-6 shadow-sm border ${ingresosMes - egresosMes >= 0 ? 'bg-blue-50 border-blue-100' : 'bg-orange-50 border-orange-100'}`}>
               <p className="text-[10px] font-bold uppercase text-gray-500">Utilidad del Mes (Ganancia)</p>
               <p className={`text-2xl font-black ${ingresosMes - egresosMes >= 0 ? 'text-blue-700' : 'text-orange-600'}`}>
                 ${(ingresosMes - egresosMes).toLocaleString()}
               </p>
            </div>

            <h4 className="font-black text-gray-900 mb-3 flex items-center gap-2"><ArrowDownCircle size={16} className="text-red-500"/> Gastos por Categoría</h4>
            <div className="space-y-2 mb-6">
              {resumenCategorias.filter(c => c.tipo === 'EGRESO').map((cat: any, i) => (
                <div key={i} className="flex justify-between items-center p-3 bg-gray-50 rounded-2xl">
                  <span className="font-bold text-sm text-gray-700">{cat.nombre}</span>
                  <span className="font-black text-red-500">${cat.total.toLocaleString()}</span>
                </div>
              ))}
              {resumenCategorias.filter(c => c.tipo === 'EGRESO').length === 0 && <p className="text-xs text-gray-400 italic">Sin egresos registrados este mes.</p>}
            </div>

            <h4 className="font-black text-gray-900 mb-3 flex items-center gap-2"><ArrowUpCircle size={16} className="text-green-500"/> Ingresos por Categoría</h4>
            <div className="space-y-2">
              {resumenCategorias.filter(c => c.tipo === 'INGRESO').map((cat: any, i) => (
                <div key={i} className="flex justify-between items-center p-3 bg-gray-50 rounded-2xl">
                  <span className="font-bold text-sm text-gray-700">{cat.nombre}</span>
                  <span className="font-black text-green-500">${cat.total.toLocaleString()}</span>
                </div>
              ))}
              {resumenCategorias.filter(c => c.tipo === 'INGRESO').length === 0 && <p className="text-xs text-gray-400 italic">Sin ingresos registrados este mes.</p>}
            </div>
            
          </div>
        </div>
      )}

      {/* ==========================================
          MENÚ INFERIOR FLOTANTE
      ========================================== */}
      <nav className="fixed bottom-8 left-8 right-8 h-20 bg-white/90 backdrop-blur-xl border border-white rounded-[2.5rem] shadow-2xl flex justify-around items-center px-6 z-30">
        <button onClick={() => setVistaActual('INICIO')} className={`flex flex-col items-center gap-1 transition-all ${vistaActual === 'INICIO' || vistaActual === 'AJUSTES' ? 'text-blue-900 scale-110' : 'text-gray-300'}`}>
          <LayoutDashboard size={22} /><span className="text-[9px] font-black uppercase">Inicio</span>
        </button>
        <button onClick={() => setVistaActual('CLIENTES')} className={`flex flex-col items-center gap-1 transition-all ${vistaActual === 'CLIENTES' || vistaActual === 'DETALLE_CLIENTE' ? 'text-blue-900 scale-110' : 'text-gray-300'}`}>
          <Users size={22} /><span className="text-[9px] font-black uppercase">Clientes</span>
        </button>
        <button onClick={() => setVistaActual('PASIVOS')} className={`flex flex-col items-center gap-1 transition-all ${vistaActual === 'PASIVOS' ? 'text-blue-900 scale-110' : 'text-gray-300'}`}>
          <CreditCard size={22} /><span className="text-[9px] font-black uppercase">Pasivos</span>
        </button>
      </nav>
    </div>
  )
}
