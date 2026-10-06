import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  Box, TextField, Button, Typography, Chip,
  Breadcrumbs, Link, Paper, Grid, Tooltip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TablePagination, IconButton, InputAdornment, Skeleton, Stack,
} from '@mui/material';
import {
  NavigateNext, Assessment, Refresh, Search, Clear,
  Inventory2Outlined, CheckCircleOutline, Autorenew, MoveDown,
  CleaningServices, FactCheckOutlined, Schedule,
  Person, Timer, FileDownload, PictureAsPdf,
  Description as CsvIcon, Today as TodayIcon,
  Warning as WarningIcon, CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import PortalLayout from '../../../components/layout/PortalLayout';
import PageHeader from '../../../components/common/PageHeader';
import DateRangeFilter from '../../../components/reports/DateRangeFilter';
import useAuth from '../../../hooks/useAuth';
import reportService from '../../../services/reportService';

const C={primary:'#0F4C81',success:'#2E7D32',warning:'#EF6C00',error:'#C62828',info:'#1565C0',purple:'#7B1FA2',teal:'#00838F',grey:'#607080'};

function fmtDateTime(ts){if(!ts)return'\u2014';const d=new Date(ts);return`${d.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})} ${d.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',second:'2-digit'})}`;}
function fmtDateTimeShort(ts){if(!ts)return'\u2014';const d=new Date(ts);return`${d.toLocaleDateString('en-GB',{day:'2-digit',month:'short'})} ${d.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})}`;}
function fmtVal(v,d='\u2014'){return v!=null?String(v):d;}
function durMin(a,b){if(!a||!b)return'\u2014';const m=Math.round((new Date(b)-new Date(a))/60000);const h=Math.floor(m/60),r=m%60;return h>0?`${h}h ${r}m`:`${r}m`;}
function durRaw(a,b){if(!a||!b)return null;return Math.round((new Date(b)-new Date(a))/60000);}

const REPORT_CONFIG={
  loading:{
    label:'Loading Report',icon:Autorenew,color:C.info,heading:'Loading Performance Analytics',
    columns:[
      {key:'Bin_Number',label:'Bin',w:90},{key:'Loader_Name',label:'Loader',w:110},{key:'Material_Name',label:'Material',w:120},{key:'Batch_Number',label:'Batch',w:100},{key:'Quantity_Loaded',label:'Qty',w:70},{key:'Bay_Name',label:'Bay',w:80},{key:'Tank_Name',label:'Tank',w:80},{key:'Loading_Start_At',label:'Started',w:150,ts:1},{key:'Loading_Completed_At',label:'Completed',w:150,ts:1},
      {key:'_duration',label:'Duration',w:80,render:(r)=>durMin(r.Loading_Start_At,r.Loading_Completed_At)},
    ],
  },
  unloading:{
    label:'Unloading Report',icon:MoveDown,color:C.warning,heading:'Unloading Efficiency Analytics',
    columns:[
      {key:'Bin_Number',label:'Bin',w:90},{key:'Unloader_Name',label:'Unloader',w:110},{key:'Material_Name',label:'Material',w:110},{key:'Batch_Number',label:'Batch',w:90},{key:'Quantity_Unloaded',label:'Qty',w:70},{key:'Unloading_Condition',label:'Condition',w:100},{key:'Unloading_Start_At',label:'Started',w:150,ts:1},{key:'Unloading_Completed_At',label:'Completed',w:150,ts:1},
      {key:'_duration',label:'Duration',w:80,render:(r)=>durMin(r.Unloading_Start_At,r.Unloading_Completed_At)},
    ],
  },
  cleaning:{
    label:'Cleaning Report',icon:CleaningServices,color:C.teal,heading:'Cleaning Operations Analytics',
    columns:[
      {key:'Bin_Number',label:'Bin',w:90},{key:'Cleaner_Name',label:'Cleaner',w:110},{key:'Cleaning_Method',label:'Method',w:100},{key:'Cleaning_Agent',label:'Agent',w:100},{key:'Water_Temp_Celsius',label:'Temp',w:70},{key:'Rinse_Cycles',label:'Rinses',w:70},{key:'Cleaning_Start_At',label:'Started',w:150,ts:1},{key:'Cleaning_Completed_At',label:'Completed',w:150,ts:1},
      {key:'_duration',label:'Duration',w:80,render:(r)=>durMin(r.Cleaning_Start_At,r.Cleaning_Completed_At)},
    ],
  },
  qa:{
    label:'QA Report',icon:FactCheckOutlined,color:C.purple,heading:'Quality Assurance Analytics',
    columns:[
      {key:'Bin_Number',label:'Bin',w:90},{key:'QA_Inspector_Name',label:'Inspector',w:120},{key:'Overall_Result',label:'Result',w:70,render:(r)=>(<Chip label={r.Overall_Result||'-'} size="small" color={r.Overall_Result==='PASS'?'success':'error'} variant="outlined" sx={{height:18,fontSize:'0.58rem',fontWeight:600}}/>)},{key:'QA_Start_At',label:'Started',w:150,ts:1},{key:'QA_Completed_At',label:'Completed',w:150,ts:1},
      {key:'_duration',label:'Duration',w:80,render:(r)=>durMin(r.QA_Start_At,r.QA_Completed_At)},
    ],
  },
  'bin-lifecycle':{
    label:'Cycle History',icon:Schedule,color:C.primary,heading:'Complete Lifecycle Analytics',
    columns:[
      {key:'Bin_Number',label:'Bin',w:90},{key:'Cycle_ID',label:'Cycle',w:60},{key:'Loading_Duration_Minutes',label:'Loading',w:85,render:(r)=><Typography variant="caption" sx={{fontSize:'0.62rem'}}>{r.Loading_Duration_Minutes!=null?`${r.Loading_Duration_Minutes}m`:'\u2014'}</Typography>},{key:'Unloading_Duration_Minutes',label:'Unload',w:80,render:(r)=><Typography variant="caption" sx={{fontSize:'0.62rem'}}>{r.Unloading_Duration_Minutes!=null?`${r.Unloading_Duration_Minutes}m`:'\u2014'}</Typography>},{key:'Cleaning_Duration_Minutes',label:'Clean',w:80,render:(r)=><Typography variant="caption" sx={{fontSize:'0.62rem'}}>{r.Cleaning_Duration_Minutes!=null?`${r.Cleaning_Duration_Minutes}m`:'\u2014'}</Typography>},{key:'QA_Duration_Minutes',label:'QA',w:75,render:(r)=><Typography variant="caption" sx={{fontSize:'0.62rem'}}>{r.QA_Duration_Minutes!=null?`${r.QA_Duration_Minutes}m`:'\u2014'}</Typography>},{key:'Total_Cycle_Duration_Minutes',label:'Total',w:85,render:(r)=><Typography variant="caption" sx={{fontSize:'0.62rem',fontWeight:600}}>{r.Total_Cycle_Duration_Minutes!=null?`${r.Total_Cycle_Duration_Minutes}m`:'\u2014'}</Typography>},{key:'Cycle_End_At',label:'Completed',w:150,ts:1},
    ],
  },
  'user-activity':{
    label:'Operator Performance',icon:Person,color:C.teal,heading:'Operator Productivity Analytics',
    columns:[
      {key:'Full_Name',label:'User',w:130},{key:'Role',label:'Role',w:100},{key:'Loading_Count',label:'Loading',w:70},{key:'Unloading_Count',label:'Unload',w:70},{key:'Cleaning_Count',label:'Clean',w:70},{key:'QA_Count',label:'QA',w:60},{key:'Last_Activity',label:'Last Active',w:150,ts:1},
    ],
  },
  'audit-trail':{
    label:'Audit Trail',icon:Assessment,color:C.grey,heading:'Business Activity Analytics',
    columns:[
      {key:'Event_Timestamp',label:'Time',w:160,ts:1},{key:'Action_Type',label:'Action',w:130,render:(r)=><Typography variant="caption" sx={{fontSize:'0.62rem',fontWeight:500}}>{(r.Action_Type||'').replace(/_/g,' ')}</Typography>},{key:'Actor_Name',label:'Actor',w:120},{key:'Target_Entity',label:'Entity',w:100},{key:'Target_ID',label:'ID',w:70},
    ],
  },
};

function TableSkeleton({ columns }) {
  return (
    <Stack spacing={0.5}>
      {Array.from({ length: 6 }).map((_, i) => (
        <Box key={i} sx={{ display: 'flex', gap: 0.75, px: 1 }}>
          {columns.map((c) => (
            <Skeleton key={c.key} variant="rounded" width={c.w || 80} height={18} sx={{ flexShrink: 0 }} />
          ))}
        </Box>
      ))}
    </Stack>
  );
}

export default function Reports(){
  const {user,logout}=useAuth();const nav=useNavigate();
  const [rt,setRt]=useState('loading');
  const [f,setF]=useState({fromDate:'',toDate:'',binNumber:'',materialId:'',bayId:'',tankId:''});
  const [data,setData]=useState({rows:[],totalCount:0});
  const [loading,setLoading]=useState(false);const [err,setErr]=useState('');
  const [page,setPage]=useState(0);const [ps,setPs]=useState(50);
  const [search,setSearch]=useState('');

  const cfg=REPORT_CONFIG[rt]||REPORT_CONFIG.loading;
  const REPORT_TYPES=Object.entries(REPORT_CONFIG).map(([k,v])=>({value:k,label:v.label,icon:v.icon,color:v.color}));

  const fetchReport=useCallback(async()=>{
    setErr('');setLoading(true);
    try{
      const res=await reportService.generateReport({
        reportType:rt,fromDate:f.fromDate||null,toDate:f.toDate||null,
        binNumber:f.binNumber||null,materialId:f.materialId||null,
        bayId:f.bayId||null,tankId:f.tankId||null,
        page:page+1,pageSize:ps,
      });
      const r=res.data?.data||{};setData({rows:r.rows||[],totalCount:r.totalCount||0});
    }catch(e){setErr(e.response?.data?.error?.message||'Failed');setData({rows:[],totalCount:0});}
    finally{setLoading(false);}
  },[rt,f,page,ps]);

  useEffect(()=>{fetchReport();},[fetchReport]);

  const filteredRows=useMemo(()=>{
    if(!search.trim())return data.rows;
    const q=search.toLowerCase();
    return data.rows.filter(r=>cfg.columns.some(c=>{
      if(c.key==='_duration')return false;
      const v=r[c.key];return v!=null&&String(v).toLowerCase().includes(q);
    }));
  },[data.rows,search,cfg]);

  const totalCount=filteredRows.length;

  // Stats derived from FULL report data (NOT search-filtered)
  const stats=useMemo(()=>{
    const rows=data.rows||[];
    if(!rows.length)return null;
    let highlight='',completed=0,pending=0,avgDuration=null,generatedAt=null;
    if(rt==='qa'){
      const pass=rows.filter(r=>r.Overall_Result==='PASS').length;
      highlight=`${Math.round(pass/rows.length*100)}% pass rate`;
      completed=pass;pending=rows.length-pass;
    }else if(rt==='loading'||rt==='unloading'||rt==='cleaning'){
      const startKey=rt==='loading'?'Loading_Start_At':rt==='unloading'?'Unloading_Start_At':'Cleaning_Start_At';
      const endKey=rt==='loading'?'Loading_Completed_At':rt==='unloading'?'Unloading_Completed_At':'Cleaning_Completed_At';
      completed=rows.filter(r=>r[endKey]).length;
      pending=rows.length-completed;
      avgDuration=completed?Math.round(rows.reduce((s,r)=>s+(durRaw(r[startKey],r[endKey])||0),0)/rows.length):null;
    }else if(rt==='bin-lifecycle'){
      completed=rows.filter(r=>r.Cycle_End_At).length;
      pending=rows.length-completed;
      avgDuration=rows.length?Math.round(rows.reduce((s,r)=>s+(r.Total_Cycle_Duration_Minutes||0),0)/rows.length):null;
    }else{
      completed=rows.length;
      pending=0;
    }
    generatedAt=new Date().toLocaleString('en-GB',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});
    return{total:rows.length,completed,pending,avgDuration,generatedAt,highlight};
  },[data.rows,rt]);

  const cols=cfg.columns;
  const paginatedRows=filteredRows.slice(page*ps,(page+1)*ps);

  const handleExcel=()=>{const rows=filteredRows.map(r=>{const o={};cols.filter(c=>c.key!=='_duration').forEach(c=>{o[c.label]=r[c.key]!=null?String(r[c.key]):'';});return o;});const ws=XLSX.utils.json_to_sheet(rows);const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'Report');XLSX.writeFile(wb,`PBLMS_${rt}.xlsx`);};
  const handlePdf=()=>{const doc=new jsPDF({orientation:'landscape',unit:'mm',format:'a4'});doc.setFontSize(7);doc.text(`PBLMS — ${cfg.label}`,14,10);const head=[cols.filter(c=>c.key!=='_duration').map(c=>c.label)];const body=filteredRows.map(r=>cols.filter(c=>c.key!=='_duration').map(c=>{const v=r[c.key];return v!=null&&typeof v!=='object'?String(v):'';}));doc.autoTable({head,body,startY:14,styles:{fontSize:5},headStyles:{fontSize:5,fillColor:[15,76,129]}});doc.save(`PBLMS_${rt}.pdf`);};
  const handleCsv=()=>{const headers=cols.filter(c=>c.key!=='_duration').map(c=>c.label).join(',');const body=filteredRows.map(r=>cols.filter(c=>c.key!=='_duration').map(c=>{const v=r[c.key];return v!=null?`"${String(v).replace(/"/g,'""')}"`:'';}).join(','));const csv=[headers,...body].join('\n');const blob=new Blob([csv],{type:'text/csv'});const url=window.URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`PBLMS_${rt}.csv`;document.body.appendChild(a);a.click();document.body.removeChild(a);window.URL.revokeObjectURL(url);};

  return(
    <PortalLayout user={user} onLogout={logout}>
      <Box>
        <Breadcrumbs separator={<NavigateNext sx={{fontSize:11}}/>} sx={{mb:0.75}}>
          <Link underline="hover" color="inherit" onClick={()=>nav('/admin/dashboard')} sx={{cursor:'pointer',fontSize:'0.68rem',fontWeight:500}}>Dashboard</Link>
          <Typography variant="caption" sx={{fontSize:'0.68rem',color:'primary.main',fontWeight:600}}>Reports & Analytics</Typography>
        </Breadcrumbs>

        {/* Page Header with export actions */}
        <PageHeader
          title="Reports & Analytics"
          subtitle={cfg.heading}
        >
          <Tooltip title="Refresh data">
            <span>
              <IconButton size="small" onClick={fetchReport} disabled={loading} sx={{p:0.75}} aria-label="Refresh">
                <Refresh sx={{fontSize:18}}/>
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Export to Excel">
            <span>
              <IconButton size="small" onClick={handleExcel} disabled={!filteredRows.length||loading} sx={{p:0.75}} aria-label="Export Excel">
                <FileDownload sx={{fontSize:18}}/>
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Export to PDF">
            <span>
              <IconButton size="small" onClick={handlePdf} disabled={!filteredRows.length||loading} sx={{p:0.75}} aria-label="Export PDF">
                <PictureAsPdf sx={{fontSize:18}}/>
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Export to CSV">
            <span>
              <IconButton size="small" onClick={handleCsv} disabled={!filteredRows.length||loading} sx={{p:0.75}} aria-label="Export CSV">
                <CsvIcon sx={{fontSize:18}}/>
              </IconButton>
            </span>
          </Tooltip>
        </PageHeader>

        {/* Report Type Selector — compact chip row */}
        <Box sx={{display:'flex',gap:0.5,mb:1,flexWrap:'wrap'}}>
          {REPORT_TYPES.map(t=>(
            <Chip
              key={t.value}
              label={t.label}
              icon={<t.icon sx={{fontSize:12}}/>}
              size="small"
              color={rt===t.value?'primary':'default'}
              variant={rt===t.value?'filled':'outlined'}
              onClick={()=>{setRt(t.value);setPage(0);setData({rows:[],totalCount:0});setSearch('');}}
              sx={{fontSize:'0.6rem',fontWeight:600,cursor:'pointer',height:26}}
              aria-label={`Show ${t.label}`}
              aria-pressed={rt===t.value}
              role="button"
              tabIndex={0}
              onKeyDown={(e)=>{if(e.key==='Enter'){setRt(t.value);setPage(0);setData({rows:[],totalCount:0});setSearch('');}}}
            />
          ))}
        </Box>

        {/* Filter Toolbar — compact single row */}
        <Box sx={{mb:1}}>
          <Grid container spacing={0.75} alignItems="center">
            <Grid item xs={6} sm={3} md={1.5}>
              <TextField
                fullWidth size="small" placeholder="Search..."
                value={search} onChange={e=>setSearch(e.target.value)}
                InputProps={{
                  startAdornment:<InputAdornment position="start"><Search sx={{fontSize:15,color:'action.disabled'}}/></InputAdornment>,
                  endAdornment:search?<InputAdornment position="end"><IconButton size="small" onClick={()=>setSearch('')} sx={{p:0.25}}><Clear sx={{fontSize:14}}/></IconButton></InputAdornment>:null,
                }}
                inputProps={{'aria-label':'Search within report'}}
                sx={{'& .MuiInputBase-root':{fontSize:'0.68rem',height:36}}}
              />
            </Grid>
            <Grid item xs={6} sm={3} md={1.25}>
              <TextField
                fullWidth size="small" placeholder="Bin #"
                value={f.binNumber} onChange={e=>setF(p=>({...p,binNumber:e.target.value}))}
                inputProps={{'aria-label':'Filter by bin number'}}
                sx={{'& .MuiInputBase-root':{fontSize:'0.68rem',height:36}}}
              />
            </Grid>
            <Grid item xs={6} sm={3} md={1.25}>
              <TextField
                fullWidth size="small" placeholder="Bay" type="number"
                value={f.bayId} onChange={e=>setF(p=>({...p,bayId:e.target.value}))}
                inputProps={{min:0,'aria-label':'Filter by bay'}}
                sx={{'& .MuiInputBase-root':{fontSize:'0.68rem',height:36}}}
              />
            </Grid>
            <Grid item xs={6} sm={3} md={1.25}>
              <TextField
                fullWidth size="small" placeholder="Tank" type="number"
                value={f.tankId} onChange={e=>setF(p=>({...p,tankId:e.target.value}))}
                inputProps={{min:0,'aria-label':'Filter by tank'}}
                sx={{'& .MuiInputBase-root':{fontSize:'0.68rem',height:36}}}
              />
            </Grid>
            <Grid item xs={6} sm={3} md={1.25}>
              <TextField
                fullWidth size="small" placeholder="Material ID" type="number"
                value={f.materialId} onChange={e=>setF(p=>({...p,materialId:e.target.value}))}
                inputProps={{min:0,'aria-label':'Filter by material'}}
                sx={{'& .MuiInputBase-root':{fontSize:'0.68rem',height:36}}}
              />
            </Grid>
            <Grid item xs={6} sm={3} md={1}>
              <TextField
                type="date" fullWidth size="small"
                InputLabelProps={{shrink:true}}
                value={f.fromDate} onChange={e=>setF(p=>({...p,fromDate:e.target.value}))}
                inputProps={{'aria-label':'From date'}}
                sx={{'& .MuiInputBase-root':{fontSize:'0.68rem',height:36}}}
                label="" placeholder="From"
              />
            </Grid>
            <Grid item xs={6} sm={3} md={1}>
              <TextField
                type="date" fullWidth size="small"
                InputLabelProps={{shrink:true}}
                value={f.toDate} onChange={e=>setF(p=>({...p,toDate:e.target.value}))}
                inputProps={{'aria-label':'To date'}}
                sx={{'& .MuiInputBase-root':{fontSize:'0.68rem',height:36}}}
                label="" placeholder="To"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={1.5}>
              <Box sx={{display:'flex',gap:0.5,alignItems:'center'}}>
                <Button
                  variant="contained" size="small"
                  startIcon={<Search sx={{fontSize:14}}/>}
                  onClick={fetchReport} disabled={loading}
                  sx={{fontSize:'0.68rem',height:36,whiteSpace:'nowrap',minWidth:72}}
                  aria-label="Generate report"
                >
                  Generate
                </Button>
                <Tooltip title="Reset filters">
                  <span>
                    <IconButton
                      size="small" onClick={()=>{setF({fromDate:'',toDate:'',binNumber:'',materialId:'',bayId:'',tankId:''});setSearch('');}}
                      disabled={loading}
                      aria-label="Reset filters"
                      sx={{height:36,width:36,border:'1px solid',borderColor:'divider',borderRadius:'6px'}}
                    >
                      <Clear sx={{fontSize:16}}/>
                    </IconButton>
                  </span>
                </Tooltip>
              </Box>
            </Grid>
          </Grid>
        </Box>

        {err&&<Typography sx={{mb:1,fontSize:'0.72rem',color:C.error,bgcolor:'#FFEBEE',px:1.5,py:0.75,borderRadius:1}}>{err}</Typography>}

        {/* Summary Strip — single row, replaces KPI cards + charts */}
        {!loading && stats && (
          <Paper sx={{p:1,mb:1,display:'flex',alignItems:'center',gap:1.5,flexWrap:'wrap'}} elevation={0} variant="outlined">
            <Box sx={{display:'flex',alignItems:'center',gap:1}}>
              <cfg.icon sx={{fontSize:20,color:cfg.color}}/>
              <Typography sx={{fontSize:'0.78rem',fontWeight:700,color:cfg.color}}>{stats.highlight}</Typography>
            </Box>
            <Box sx={{width:1,height:20,bgcolor:'divider'}} />
            <Chip icon={<TodayIcon sx={{fontSize:12}}/>} label={`${stats.total} records`} size="small" sx={{height:22,fontSize:'0.6rem',fontWeight:500}} variant="outlined" />
            {stats.completed>0&&<Chip icon={<CheckCircleIcon sx={{fontSize:12}}/>} label={`Completed: ${stats.completed}`} size="small" sx={{height:22,fontSize:'0.6rem',fontWeight:500,color:C.success}} variant="outlined" />}
            {stats.pending>0&&<Chip icon={<WarningIcon sx={{fontSize:12}}/>} label={`Pending: ${stats.pending}`} size="small" sx={{height:22,fontSize:'0.6rem',fontWeight:500,color:C.warning}} variant="outlined" />}
            {stats.avgDuration!=null&&<Chip icon={<Timer sx={{fontSize:12}}/>} label={`Avg: ${stats.avgDuration} min`} size="small" sx={{height:22,fontSize:'0.6rem',fontWeight:500}} variant="outlined" />}
            <Chip icon={<Schedule sx={{fontSize:12}}/>} label={`Generated: ${stats.generatedAt}`} size="small" sx={{height:22,fontSize:'0.6rem',fontWeight:500,color:'text.secondary'}} variant="outlined" />
          </Paper>
        )}

        {/* Report Table */}
        {loading ? (
          <Paper sx={{p:1.5}} elevation={0} variant="outlined">
            <TableSkeleton columns={cols} />
          </Paper>
        ) : !data.rows.length ? (
          <Paper sx={{p:3,textAlign:'center',border:'1px dashed',borderColor:'divider'}} elevation={0}>
            <Assessment sx={{fontSize:36,color:'text.disabled',mb:1}}/>
            <Typography variant="body2" color="text.secondary" sx={{fontSize:'0.8rem'}}>
              {err?'An error occurred while loading the report.':`No data found for ${cfg.label}. Adjust filters and click Generate.`}
            </Typography>
            {!err&&(
              <Button variant="outlined" size="small" sx={{mt:1,fontSize:'0.68rem'}} startIcon={<Refresh/>} onClick={fetchReport}>
                Generate Report
              </Button>
            )}
          </Paper>
        ) : (
          <>
            <TableContainer component={Paper} elevation={0} variant="outlined" sx={{border:'1px solid',borderColor:'divider',borderRadius:1}}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    {cols.map(c=><TableCell key={c.key} sx={{fontWeight:700,fontSize:'0.62rem',py:0.75,color:'text.secondary',letterSpacing:'0.03em',minWidth:c.w||80,bgcolor:'#F8FAFD'}}>{c.label}</TableCell>)}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedRows.map((row,idx)=>(
                    <TableRow
                      key={idx}
                      hover
                      sx={{'&:last-child td':{borderBottom:0},'&:hover':{bgcolor:'#F8FAFD'},transition:'background-color 0.12s'}}
                    >
                      {cols.map(c=>{
                        if(c.key==='_duration')return <TableCell key={c.key} sx={{py:0.6,fontSize:'0.62rem'}}>{c.render?c.render(row):'\u2014'}</TableCell>;
                        if(c.render)return <TableCell key={c.key} sx={{py:0.6}}>{c.render(row)}</TableCell>;
                        const v=row[c.key];
                        if(c.ts)return <TableCell key={c.key} sx={{fontFamily:'monospace',fontSize:'0.6rem',py:0.6,whiteSpace:'nowrap',color:'text.secondary'}}>{fmtDateTime(v)}</TableCell>;
                        return <TableCell key={c.key} sx={{py:0.6}}><Typography variant="caption" sx={{fontSize:'0.62rem'}}>{fmtVal(v)}</Typography></TableCell>;
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {totalCount>ps&&(
              <Box sx={{display:'flex',justifyContent:'flex-end',mt:0.75}}>
                <TablePagination component="div" count={totalCount} page={page} onPageChange={(_,p)=>setPage(p)} rowsPerPage={ps} onRowsPerPageChange={e=>{setPs(Number(e.target.value));setPage(0);}} rowsPerPageOptions={[25,50,100]} sx={{'& .MuiTablePagination-toolbar':{minHeight:36,fontSize:'0.68rem'},'& .MuiTablePagination-selectLabel,& .MuiTablePagination-displayedRows':{fontSize:'0.65rem'}}}/>
              </Box>
            )}
          </>
        )}
      </Box>
    </PortalLayout>
  );
}
