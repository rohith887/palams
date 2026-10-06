import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box, TextField, MenuItem, Button, Typography, Chip,
  Breadcrumbs, Link, Paper, Grid, Tooltip,
  Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, TablePagination, Drawer, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions,
  LinearProgress,
} from '@mui/material';
import {
  NavigateNext as NavigateNextIcon,
  NotificationsActive as AlertIcon,
  CheckCircle as AcknowledgeIcon,
  TaskAlt as ResolveIcon,
  PersonAdd as AssignIcon,
  Clear as UnassignIcon,
  Visibility as ViewIcon,
  Close as CloseIcon,
  ArrowBack as ArrowBackIcon,
  Refresh as RefreshIcon,
  ErrorOutline as CriticalIcon,
  Warning as HighIcon,
  InfoOutlined as MediumIcon,
  LowPriority as LowIcon,
  AccessTime as AccessTimeIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import PortalLayout from '../../../components/layout/PortalLayout';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import EmptyState from '../../../components/common/EmptyState';
import ConfirmationDialog from '../../../components/common/ConfirmationDialog';
import useAuth from '../../../hooks/useAuth';
import alertService from '../../../services/alertService';
import dashboardService from '../../../services/dashboardService';

const C = { primary:'#0F4C81', success:'#2E7D32', warning:'#EF6C00', error:'#C62828', info:'#1565C0', purple:'#7B1FA2', teal:'#00838F', grey:'#607080' };

// ─── 4-tier severity config ──────────────────────────────────────────────

const SEVERITY_CONFIG = {
  Critical: { bg:'#FFEBEE', color:'#C62828', icon:CriticalIcon, order:0 },
  High:     { bg:'#FFF3E0', color:'#E65100', icon:HighIcon, order:1 },
  Medium:   { bg:'#E3F0FF', color:'#0F4C81', icon:MediumIcon, order:2 },
  Low:      { bg:'#F5F5F5', color:'#757575', icon:LowIcon, order:3 },
  Info:     { bg:'#F5F5F5', color:'#757575', icon:LowIcon, order:4 },
  Warning:  { bg:'#FFF3E0', color:'#E65100', icon:HighIcon, order:2 },
};

const SEVERITY_OPTIONS = ['Critical','High','Medium','Low'];
const STATUS_OPTIONS = [{value:'active',label:'Active'},{value:'acknowledged',label:'Acknowledged'},{value:'resolved',label:'Resolved'}];

// ─── Helpers ─────────────────────────────────────────────────────────────

function fmtDateTime(ts) { if(!ts)return'\u2014'; const d=new Date(ts); return `${d.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})} ${d.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})}`; }
function fmtAge(ts) { if(!ts)return''; const diff=Math.round((Date.now()-new Date(ts).getTime())/60000); if(diff<60)return`${diff}m`; const h=Math.floor(diff/60); if(h<24)return`${h}h`; return`${Math.floor(h/24)}d`; }
function alertStatus(a) { if(a.Resolved_At)return{label:'Resolved',color:'success'}; if(a.Acknowledged_At)return{label:'Acknowledged',color:'info'}; return{label:'Active',color:'error'}; }

// ─── Main Component ──────────────────────────────────────────────────────

export default function Alerts() {
  const {user,logout}=useAuth(); const nav=useNavigate();
  const [alerts,setAlerts]=useState([]);
  const [loading,setLoading]=useState(false); const [err,setErr]=useState('');
  const [page,setPage]=useState(0); const [ps,setPs]=useState(25);
  const [drawerAlert,setDrawerAlert]=useState(null);
  const [ack,setAck]=useState(null); const [resolve,setResolve]=useState(null);
  const [assignDlg,setAssignDlg]=useState(null); const [assignUid,setAssignUid]=useState('');
  const [f,setF]=useState({severity:'',status:'active',category:'',fromDate:'',toDate:'',search:''});
  const [applied,setApplied]=useState({});
  const [users,setUsers]=useState([]);
  const [summary,setSummary]=useState({critical:0,high:0,medium:0,low:0,open:0,acknowledged:0,resolvedToday:0});

  // Load users for assign dropdown + severity counts for summary cards
  useEffect(()=>{
    import('../../../services/authService').then(m=>m.default.getUsers?.().then(r=>setUsers(r?.data?.data||[])).catch(()=>{}));
    alertService.getSeverityCounts().then(r=>{
      const d=(r.data?.data||[]).reduce((acc,row)=>{acc[row.Severity.toLowerCase()]=row.cnt;return acc;},{});
      setSummary(p=>({...p,critical:d.critical||0,high:d.high||0,medium:d.medium||0,low:(d.low||0)+(d.info||0)}));
    }).catch(()=>{});
    dashboardService.getAdminDashboard().then(r=>{
      const d=r.data?.data||{}; const k=d.kpis||{};
      setSummary(p=>({...p,open:k.active_alerts||0,resolvedToday:k.completed_today||0}));
    }).catch(()=>{});
  },[]);

  // fetchData is stable — no external dependencies. Called imperatively by handlers.
  const fetchData=useCallback(async(filt)=>{setErr('');setLoading(true);try{const res=await alertService.getAlerts({severity:filt.severity||undefined,status:filt.status||undefined,fromDate:filt.fromDate||undefined,toDate:filt.toDate||undefined,search:filt.search||undefined});setAlerts(res.data?.data||[]);}catch(e){setErr(e.response?.data?.error?.message||'Failed');setAlerts([]);}finally{setLoading(false);}},[]);

  // Initial load — only runs once on mount
  useEffect(()=>{const def={severity:'',status:'active',category:'',fromDate:'',toDate:'',search:''};setF(def);setApplied(def);fetchData(def);},[]); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-fetch when filters change (but NOT on initial mount — skip first render with ref)
  const isFirst=useRef(true);
  useEffect(()=>{if(isFirst.current){isFirst.current=false;return;}setPage(0);setApplied({...f});fetchData(f);},[f.severity,f.status,f.category,f.search]);
  const handleAck=async()=>{if(!ack)return;try{await alertService.acknowledgeAlert(ack);fetchData(f);}catch(e){setErr(e.response?.data?.error?.message||'Failed');}finally{setAck(null);}};
  const handleResolve=async()=>{if(!resolve)return;try{await alertService.resolveAlert(resolve);fetchData(f);}catch(e){setErr(e.response?.data?.error?.message||'Failed');}finally{setResolve(null);}};
  const handleAssign=async()=>{if(!assignDlg||!assignUid)return;try{await alertService.assignAlert(assignDlg,parseInt(assignUid,10));fetchData(f);}catch(e){setErr(e.response?.data?.error?.message||'Failed');}finally{setAssignDlg(null);setAssignUid('');}};
  const handleUnassign=async(id)=>{try{await alertService.assignAlert(id,null);fetchData(f);}catch(e){setErr(e.response?.data?.error?.message||'Failed');}};

  const paginated=alerts.slice(page*ps,(page+1)*ps); const total=alerts.length;

  const summaryCards=[
    {label:'Critical',value:summary.critical,color:C.error,bg:'#FFEBEE'},
    {label:'High',value:summary.high,color:C.warning,bg:'#FFF3E0'},
    {label:'Medium',value:summary.medium,color:C.info,bg:'#E3F0FF'},
    {label:'Low',value:summary.low,color:C.grey,bg:'#F5F5F5'},
    {label:'Open',value:summary.open,color:C.error,bg:'#FFEBEE'},
    {label:'Acknowledged',value:summary.acknowledged,color:C.teal,bg:'#E0F7FA'},
    {label:'Resolved Today',value:summary.resolvedToday,color:C.success,bg:'#E8F5E9'},
  ];

  const handleExcel=()=>{const data=alerts.map(a=>({Type:(a.Alert_Type||'').replace(/_/g,' '),Priority:a.Severity||'',Status:alertStatus(a).label,Message:a.Alert_Message||'',Bin:a.Bin_Number||'',Assigned:a.assigned_to_name||'',Created:fmtDateTime(a.Created_At),Age:fmtAge(a.Created_At)}));const ws=XLSX.utils.json_to_sheet(data);const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'Alerts');XLSX.writeFile(wb,'PBLMS_Alerts.xlsx');};
  const handlePdf=()=>{const doc=new jsPDF({orientation:'landscape',unit:'mm',format:'a4'});doc.setFontSize(7);doc.text('Alerts — PBLMS',14,10);const head=[['Type','Priority','Status','Message','Bin','Assigned','Created','Age']];const body=alerts.map(a=>[(a.Alert_Type||'').replace(/_/g,' '),a.Severity||'',alertStatus(a).label,a.Alert_Message||'',a.Bin_Number||'',a.assigned_to_name||'',fmtDateTime(a.Created_At),fmtAge(a.Created_At)]);doc.autoTable({head,body,startY:14,styles:{fontSize:5},headStyles:{fontSize:5,fillColor:[15,76,129]}});doc.save('PBLMS_Alerts.pdf');};

  return (
    <PortalLayout user={user} onLogout={logout}>
      <Box>
        <Breadcrumbs separator={<NavigateNextIcon sx={{fontSize:11}}/>} sx={{mb:0.75}}>
          <Link underline="hover" color="inherit" onClick={()=>nav('/admin/dashboard')} sx={{cursor:'pointer',fontSize:'0.68rem',fontWeight:500}}>Dashboard</Link>
          <Typography variant="caption" sx={{fontSize:'0.68rem',color:'primary.main',fontWeight:600}}>Alert Center</Typography>
        </Breadcrumbs>

        <Box sx={{display:'flex',alignItems:'center',justifyContent:'space-between',mb:1.5,flexWrap:'wrap',gap:1}}>
          <Box sx={{display:'flex',alignItems:'center',gap:1.5}}>
            <Typography sx={{fontWeight:700,fontSize:'0.95rem'}}>Alert Center</Typography>
            <Typography variant="caption" color="text.secondary" sx={{fontSize:'0.7rem'}}>Enterprise incident management and operational alerts</Typography>
          </Box>
          <Box sx={{display:'flex',gap:0.75}}>
            <Button size="small" variant="outlined" startIcon={<ArrowBackIcon sx={{fontSize:15}}/>} onClick={()=>nav('/admin/dashboard')} sx={{fontSize:'0.68rem',py:0.3}}>Back</Button>
            <Tooltip title="Refresh"><IconButton size="small" onClick={()=>fetchData(f)}><RefreshIcon sx={{fontSize:17}}/></IconButton></Tooltip>
            {alerts.length>0&&<><Button size="small" variant="outlined" onClick={handleExcel} sx={{fontSize:'0.68rem',py:0.3}}>Excel</Button><Button size="small" variant="outlined" onClick={handlePdf} sx={{fontSize:'0.68rem',py:0.3}}>PDF</Button></>}
          </Box>
        </Box>

        {/* Summary Cards Row */}
        <Grid container spacing={1} sx={{mb:1.5}}>
          {summaryCards.map(c=>(<Grid item xs={6} sm={4} md={2} lg={1.7} key={c.label}>
            <Paper sx={{p:1.25,textAlign:'center',bgcolor:c.bg,borderRadius:1.5,border:`1px solid ${c.color}20`}}>
              <Typography sx={{fontSize:'1.3rem',fontWeight:800,color:c.color}}>{c.value}</Typography>
              <Typography sx={{fontSize:'0.58rem',color:C.grey,textTransform:'uppercase',letterSpacing:'0.04em',fontWeight:600}}>{c.label}</Typography>
            </Paper>
          </Grid>))}
        </Grid>

        {/* Filters */}
        <Paper sx={{p:1.25,mb:1.5,border:'1px solid',borderColor:'divider',borderRadius:1.5}}>
          <Grid container spacing={1} alignItems="center">
            <Grid item xs={6} sm={3} md={2}>
              <TextField select label="Priority" fullWidth size="small" SelectProps={{displayEmpty:true}} value={f.severity} onChange={e=>{const v=e.target.value;setF(p=>({...p,severity:v}));}} sx={{'& .MuiInputBase-root':{fontSize:'0.7rem'}}}><MenuItem value="">All</MenuItem>{SEVERITY_OPTIONS.map(s=><MenuItem key={s} value={s}>{s}</MenuItem>)}</TextField>
            </Grid>
            <Grid item xs={6} sm={3} md={2}>
              <TextField select label="Status" fullWidth size="small" SelectProps={{displayEmpty:true}} value={f.status} onChange={e=>{const v=e.target.value;setF(p=>({...p,status:v}));}} sx={{'& .MuiInputBase-root':{fontSize:'0.7rem'}}}><MenuItem value="">All</MenuItem>{STATUS_OPTIONS.map(s=><MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>)}</TextField>
            </Grid>
            <Grid item xs={6} sm={3} md={2}>
              <TextField select label="Category" fullWidth size="small" SelectProps={{displayEmpty:true}} value={f.category} onChange={e=>{const v=e.target.value;setF(p=>({...p,category:v}));}} sx={{'& .MuiInputBase-root':{fontSize:'0.7rem'}}}><MenuItem value="">All</MenuItem><MenuItem value="QA_FAILURE">QA Failure</MenuItem><MenuItem value="CLEANING_DELAY">Cleaning Delay</MenuItem><MenuItem value="WORKFLOW_TIMEOUT">Workflow Timeout</MenuItem><MenuItem value="IDLE_BIN">Idle Bin</MenuItem><MenuItem value="BAY_OFFLINE">Bay Offline</MenuItem><MenuItem value="TANK_OFFLINE">Tank Offline</MenuItem><MenuItem value="QR_MISSING">QR Missing</MenuItem><MenuItem value="MATERIAL_MISMATCH">Material Mismatch</MenuItem><MenuItem value="OPERATOR_EXCEPTION">Operator Exception</MenuItem><MenuItem value="CAPACITY_EXCEEDED">Capacity Exceeded</MenuItem></TextField>
            </Grid>
            <Grid item xs={6} sm={3} md={3}>
              <TextField label="Search" fullWidth size="small" placeholder="type, message, bin..." value={f.search} onChange={e=>setF(p=>({...p,search:e.target.value}))} sx={{'& .MuiInputBase-root':{fontSize:'0.7rem'}}}/>
            </Grid>
          </Grid>
          <Typography variant="caption" color="text.secondary" sx={{display:'block',mt:0.75,fontSize:'0.55rem'}}>Filters apply immediately — showing {total} alerts</Typography>
        </Paper>

        {err && <Typography sx={{mb:1.5,fontSize:'0.72rem',color:C.error,bgcolor:'#FFEBEE',px:1.5,py:0.75,borderRadius:1}}>{err} <Link component="button" onClick={()=>setErr('')} sx={{fontSize:'0.65rem',ml:1}}>Dismiss</Link></Typography>}
        {loading && <LoadingSpinner/>}

        {!loading&&!err&&alerts.length===0&&(
          <EmptyState icon={<AcknowledgeIcon sx={{fontSize:40,color:'success.main'}}/>} title="No Alerts" message="All alerts are resolved or no alerts match your filters."/>
        )}

        {!loading&&alerts.length>0&&(
          <Paper sx={{border:'1px solid',borderColor:'divider',borderRadius:1}}>
            <TableContainer>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{fontWeight:700,fontSize:'0.6rem',py:0.75,bgcolor:'#F5F6FA'}}>Priority</TableCell>
                    <TableCell sx={{fontWeight:700,fontSize:'0.6rem',py:0.75,bgcolor:'#F5F6FA'}}>Alert Type</TableCell>
                    <TableCell sx={{fontWeight:700,fontSize:'0.6rem',py:0.75,bgcolor:'#F5F6FA'}}>Bin</TableCell>
                    <TableCell sx={{fontWeight:700,fontSize:'0.6rem',py:0.75,bgcolor:'#F5F6FA'}}>User</TableCell>
                    <TableCell sx={{fontWeight:700,fontSize:'0.6rem',py:0.75,bgcolor:'#F5F6FA'}}>Message</TableCell>
                    <TableCell sx={{fontWeight:700,fontSize:'0.6rem',py:0.75,bgcolor:'#F5F6FA'}}>Age</TableCell>
                    <TableCell sx={{fontWeight:700,fontSize:'0.6rem',py:0.75,bgcolor:'#F5F6FA'}}>Status</TableCell>
                    <TableCell sx={{fontWeight:700,fontSize:'0.6rem',py:0.75,bgcolor:'#F5F6FA'}}>Assigned</TableCell>
                    <TableCell sx={{fontWeight:700,fontSize:'0.6rem',py:0.75,width:110,bgcolor:'#F5F6FA'}}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginated.map(a=>{
                    const sev=SEVERITY_CONFIG[a.Severity]||SEVERITY_CONFIG.Low;
                    const SevIco=sev.icon; const st=alertStatus(a); const age=fmtAge(a.Created_At);
                    return (
                      <TableRow key={a.Alert_ID} hover sx={{'&:last-child td':{borderBottom:0}}}>
                        <TableCell sx={{py:0.5}}>
                          <Chip label={a.Severity||'Low'} size="small"
                            icon={<Box component={SevIco} sx={{fontSize:11,color:sev.color,ml:'6px!important'}}/>}
                            sx={{height:20,fontSize:'0.55rem',fontWeight:600,bgcolor:sev.bg,color:sev.color,'& .MuiChip-icon':{color:sev.color}}}/>
                        </TableCell>
                        <TableCell sx={{py:0.5}}>
                          <Typography variant="caption" sx={{fontSize:'0.6rem',fontWeight:500}}>{(a.Alert_Type||'').replace(/_/g,' ')}</Typography>
                        </TableCell>
                        <TableCell sx={{py:0.5}}>
                          {a.Bin_Number?<Chip label={a.Bin_Number} size="small" variant="outlined" sx={{height:18,fontSize:'0.55rem',fontWeight:500}}/>:<Typography variant="caption" color="text.disabled" sx={{fontSize:'0.6rem'}}>\u2014</Typography>}
                        </TableCell>
                        <TableCell sx={{py:0.5}}><Typography variant="caption" sx={{fontSize:'0.6rem'}}>{a.user_name||'\u2014'}</Typography></TableCell>
                        <TableCell sx={{py:0.5,maxWidth:200}}>
                          <Typography variant="caption" sx={{fontSize:'0.58rem',display:'block',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:200}}>{a.Alert_Message||'\u2014'}</Typography>
                        </TableCell>
                        <TableCell sx={{py:0.5}}>
                          <Box sx={{display:'flex',alignItems:'center',gap:0.5}}>
                            <AccessTimeIcon sx={{fontSize:11,color:age.includes('d')?C.error:age.includes('h')?C.warning:C.grey}}/>
                            <Typography variant="caption" sx={{fontSize:'0.6rem',fontFamily:'monospace',fontWeight:600,color:age.includes('d')?C.error:'text.primary'}}>{age||'<1m'}</Typography>
                          </Box>
                        </TableCell>
                        <TableCell sx={{py:0.5}}>
                          <Chip label={st.label} size="small" color={st.color} variant="outlined" sx={{height:18,fontSize:'0.55rem',fontWeight:600}}/>
                        </TableCell>
                        <TableCell sx={{py:0.5}}>
                          {a.assigned_to_name?(
                            <Box sx={{display:'flex',alignItems:'center',gap:0.25}}>
                              <Typography variant="caption" sx={{fontSize:'0.6rem'}}>{a.assigned_to_name}</Typography>
                              <Tooltip title="Unassign"><IconButton size="small" onClick={()=>handleUnassign(a.Alert_ID)} sx={{p:0.25}}><CloseIcon sx={{fontSize:12}}/></IconButton></Tooltip>
                            </Box>
                          ):(<Typography variant="caption" color="text.disabled" sx={{fontSize:'0.58rem'}}>Unassigned</Typography>)}
                        </TableCell>
                        <TableCell sx={{py:0.5}}>
                          <Box sx={{display:'flex',gap:0.25}}>
                            <Tooltip title="View"><IconButton size="small" onClick={()=>setDrawerAlert(a)}><ViewIcon sx={{fontSize:15}}/></IconButton></Tooltip>
                            {!a.Acknowledged_At&&<Tooltip title="Acknowledge"><IconButton size="small" onClick={()=>setAck(a.Alert_ID)}><AcknowledgeIcon sx={{fontSize:15,color:'success.main'}}/></IconButton></Tooltip>}
                            {a.Acknowledged_At&&!a.Resolved_At&&<Tooltip title="Resolve"><IconButton size="small" onClick={()=>setResolve(a.Alert_ID)}><ResolveIcon sx={{fontSize:15,color:'info.main'}}/></IconButton></Tooltip>}
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
            {total>ps&&<Box sx={{display:'flex',justifyContent:'flex-end',mt:0.5}}><TablePagination component="div" count={total} page={page} onPageChange={(_,p)=>setPage(p)} rowsPerPage={ps} onRowsPerPageChange={e=>{setPs(Number(e.target.value));setPage(0);}} rowsPerPageOptions={[25,50,100]} sx={{'.MuiTablePagination-toolbar':{minHeight:40,fontSize:'0.7rem'},'.MuiTablePagination-selectLabel,.MuiTablePagination-displayedRows':{fontSize:'0.68rem'}}}/></Box>}
          </Paper>
        )}

        {/* Detail Drawer */}
        <Drawer anchor="right" open={Boolean(drawerAlert)} onClose={()=>setDrawerAlert(null)} PaperProps={{sx:{width:{xs:'100%',sm:520},p:0}}}>
          {drawerAlert&&(()=>{const a=drawerAlert;const sev=SEVERITY_CONFIG[a.Severity]||SEVERITY_CONFIG.Low;const st=alertStatus(a);return(<Box><Box sx={{p:2,borderBottom:'1px solid',borderColor:'divider',bgcolor:'#F8FAFD',display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}><Box><Typography variant="overline" sx={{fontSize:'0.6rem',fontWeight:700,color:'text.secondary',letterSpacing:'0.08em'}}>Alert Detail</Typography><Box sx={{display:'flex',alignItems:'center',gap:1,mt:0.5}}><Chip label={a.Severity||'Low'} size="small" sx={{height:20,fontSize:'0.6rem',fontWeight:600,bgcolor:sev.bg,color:sev.color}}/><Typography variant="h6" sx={{fontWeight:700,fontSize:'0.85rem'}}>{(a.Alert_Type||'').replace(/_/g,' ')}</Typography><Chip label={st.label} size="small" color={st.color} variant="outlined" sx={{height:20,fontSize:'0.58rem',fontWeight:600}}/></Box></Box><IconButton size="small" onClick={()=>setDrawerAlert(null)}><CloseIcon sx={{fontSize:18}}/></IconButton></Box><Box sx={{p:2}}><Grid container spacing={1.5}><Grid item xs={12}><Label label="Message" value={a.Alert_Message||'\u2014'}/></Grid><Grid item xs={6}><Label label="Created" value={fmtDateTime(a.Created_At)} mono/></Grid><Grid item xs={6}><Label label="Age" value={fmtAge(a.Created_At)||'<1m'}/></Grid><Grid item xs={6}><Label label="Priority" value={a.Severity||'Low'}/></Grid><Grid item xs={6}><Label label="Bin Number" value={a.Bin_Number||'\u2014'} mono={!!a.Bin_Number}/></Grid><Grid item xs={6}><Label label="User" value={a.user_name||'\u2014'}/></Grid><Grid item xs={6}><Label label="Assigned" value={a.assigned_to_name||'Unassigned'}/></Grid><Grid item xs={6}><Label label="Acknowledged" value={a.Acknowledged_At?fmtDateTime(a.Acknowledged_At):'Not yet'} mono={!!a.Acknowledged_At}/></Grid><Grid item xs={6}><Label label="Resolved" value={a.Resolved_At?fmtDateTime(a.Resolved_At):'Not yet'} mono={!!a.Resolved_At}/></Grid></Grid><Box sx={{mt:2,display:'flex',gap:1,flexWrap:'wrap'}}>{!a.Acknowledged_At&&<Button size="small" variant="contained" color="success" startIcon={<AcknowledgeIcon/>} onClick={()=>{setAck(a.Alert_ID);setDrawerAlert(null);}} sx={{fontSize:'0.65rem'}}>Acknowledge</Button>}{a.Acknowledged_At&&!a.Resolved_At&&<Button size="small" variant="contained" color="info" startIcon={<ResolveIcon/>} onClick={()=>{setResolve(a.Alert_ID);setDrawerAlert(null);}} sx={{fontSize:'0.65rem'}}>Resolve</Button>}{!a.assigned_to_name&&<Button size="small" variant="outlined" startIcon={<AssignIcon/>} onClick={()=>{setAssignDlg(a.Alert_ID);setAssignUid('');setDrawerAlert(null);}} sx={{fontSize:'0.65rem'}}>Assign</Button>}</Box></Box></Box>);})()}
        </Drawer>

        <ConfirmationDialog open={ack!==null} title="Acknowledge Alert" message="Mark this alert as acknowledged?" severity="info" confirmLabel="Acknowledge" onConfirm={handleAck} onCancel={()=>setAck(null)}/>
        <ConfirmationDialog open={resolve!==null} title="Resolve Alert" message="Mark this alert as resolved?" severity="info" confirmLabel="Resolve" onConfirm={handleResolve} onCancel={()=>setResolve(null)}/>

        <Dialog open={assignDlg!==null} onClose={()=>setAssignDlg(null)} maxWidth="xs" fullWidth>
          <DialogTitle sx={{fontSize:'0.85rem',fontWeight:700}}>Assign Alert</DialogTitle>
          <DialogContent><TextField select label="Assign To" fullWidth size="small" value={assignUid} onChange={e=>setAssignUid(e.target.value)} sx={{mt:1,'& .MuiInputBase-root':{fontSize:'0.72rem'}}}><MenuItem value="">Select user</MenuItem>{users.map(u=><MenuItem key={u.User_ID||u.user_id} value={u.User_ID||u.user_id} sx={{fontSize:'0.72rem'}}>{u.Full_Name||u.full_name}</MenuItem>)}</TextField></DialogContent>
          <DialogActions><Button size="small" onClick={()=>setAssignDlg(null)}>Cancel</Button><Button size="small" variant="contained" onClick={handleAssign} disabled={!assignUid}>Assign</Button></DialogActions>
        </Dialog>
      </Box>
    </PortalLayout>
  );
}

function Label({label,value,mono}){return(<Box><Typography variant="caption" color="text.secondary" sx={{fontSize:'0.6rem'}}>{label}</Typography><Typography variant="caption" sx={{fontSize:'0.67rem',fontWeight:500,fontFamily:mono?'monospace':undefined,display:'block'}}>{value}</Typography></Box>);}
