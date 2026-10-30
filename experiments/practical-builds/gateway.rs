use std::collections::{BTreeMap, HashMap, HashSet};

#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash)]
pub enum Workflow {SupportLookup,RefundReview,RefundExecute,Notifications}
pub fn offered_tools(workflow:Workflow)->&'static[&'static str] {
    match workflow {
        Workflow::SupportLookup=>&["find_invoice","read_invoice"],
        Workflow::RefundReview=>&["read_invoice","preview_refund"],
        Workflow::RefundExecute=>&["read_invoice","execute_refund"],
        Workflow::Notifications=>&["send_mail"],
    }
}
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum Call {
    FindInvoice {query:String,page_size:u16},
    ReadInvoice {record_id:String},
    PreviewRefund {record_id:String,note:String},
    ExecuteRefund {record_id:String,amount:u64},
    SendMail {recipient:String,subject:String,body:String},
}
impl Call {
    pub fn name(&self)->&'static str {match self {Self::FindInvoice{..}=>"find_invoice",Self::ReadInvoice{..}=>"read_invoice",Self::PreviewRefund{..}=>"preview_refund",Self::ExecuteRefund{..}=>"execute_refund",Self::SendMail{..}=>"send_mail"}}
    fn writes(&self)->bool {matches!(self,Self::ExecuteRefund{..}|Self::SendMail{..})}
    fn valid(&self)->bool {
        let id=|value:&str|!value.is_empty()&&value.len()<=64&&value.bytes().all(|byte|byte.is_ascii_alphanumeric()||b"-_".contains(&byte));
        match self {
            Self::FindInvoice{query,page_size}=>query.len()<=64&&!query.contains('\0')&&(1..=3).contains(page_size),
            Self::ReadInvoice{record_id}=>id(record_id),
            Self::PreviewRefund{record_id,note}=>id(record_id)&&note.len()<=256,
            Self::ExecuteRefund{record_id,amount}=>id(record_id)&&(1..=1000).contains(amount),
            Self::SendMail{recipient,subject,body}=>mail_valid(recipient,subject,body),
        }
    }
}
fn mail_valid(recipient:&str,subject:&str,body:&str)->bool {
    recipient.len()<=64&&recipient.ends_with("@example.test")&&recipient.bytes().filter(|byte|*byte==b'@').count()==1&&!recipient.bytes().any(|byte|byte.is_ascii_whitespace())&&subject.len()<=128&&body.len()<=1024
}
pub struct Mail {pub recipient:String,pub subject:String,pub body:String}
#[derive(Default)]
pub struct CapturedMail {pub messages:Vec<Mail>}
impl CapturedMail {
    pub fn send(&mut self,mail:Mail)->Result<(),&'static str> {
        if !mail_valid(&mail.recipient,&mail.subject,&mail.body){return Err("invalid captured message");}
        self.messages.push(mail);Ok(())
    }
}
#[derive(Debug,PartialEq,Eq)]
pub enum ToolError {Denied,Arguments,Approval,Expired,Conflict,Unresolved,Budget,NotFound,Transport,OutputTooLarge}
#[derive(Debug,PartialEq,Eq)]
pub enum Output {Rows(Vec<String>),Value(String),Done}
type ContextKey=(String,String,String,Workflow,String);
pub struct Context {actor:String,tenant:String,account:String,workflow:Workflow,key:String,revision:u64,deadline:u64,remaining:usize,request_id:String}
impl Context {
    fn identity(&self)->ContextKey{(self.actor.clone(),self.tenant.clone(),self.account.clone(),self.workflow,self.key.clone())}
    pub fn exhaust(&mut self){self.remaining=0;}
    pub fn actor(&self)->&str{&self.actor}
    pub fn tenant(&self)->&str{&self.tenant}
    pub fn account(&self)->&str{&self.account}
}
#[derive(Clone)]
struct User {tenant:&'static str,accounts:Vec<&'static str>,write:bool}
#[derive(Clone,PartialEq,Eq,Debug)]
pub struct Effect {pub tenant:String,pub account:String,pub key:String,pub tool:&'static str,pub credential_reference:String}
pub struct Audit {pub operation_id:String,pub actor_reference:String,pub tool_name:&'static str,pub policy_version:u64,pub decision:&'static str,pub outcome:&'static str,pub request_id:String}
struct Approval {actor:String,tenant:String,account:String,workflow:Workflow,call:Call,revision:u64,expires:u64}
struct Receipt {call:Call,unresolved:bool}
pub struct Gateway {
    users:HashMap<&'static str,User>,revoked:HashSet<String>,revision:u64,now:u64,
    approvals:HashMap<ContextKey,Approval>,receipts:HashMap<ContextKey,Receipt>,
    pub records:BTreeMap<(String,String),String>,pub effects:Vec<Effect>,pub credential_uses:Vec<String>,pub mail:CapturedMail,pub audit:Vec<Audit>,pub fail_after_effect:bool,pub failure_detail:Option<String>,
}
impl Gateway {
    pub fn capture_only()->Self {
        let users=HashMap::from([
            ("alice",User{tenant:"tenant-a",accounts:vec!["account-a"],write:false}),
            ("bob",User{tenant:"tenant-b",accounts:vec!["account-b"],write:false}),
            ("operator",User{tenant:"tenant-a",accounts:vec!["account-a"],write:true}),
        ]);
        let records=BTreeMap::from([(("account-a".into(),"42".into()),"invoice-a-42".into()),(("account-b".into(),"42".into()),"invoice-b-42".into())]);
        Self {users,records,revoked:HashSet::new(),revision:1,now:10,approvals:HashMap::new(),receipts:HashMap::new(),effects:Vec::new(),credential_uses:Vec::new(),mail:CapturedMail::default(),audit:Vec::new(),fail_after_effect:false,failure_detail:None}
    }
    pub fn context(&self,token:&str,account:&str,workflow:Workflow,key:&str,request_id:&str)->Result<Context,ToolError> {
        let actor=match token {"fixture-alice"=>"alice","fixture-bob"=>"bob","fixture-operator"=>"operator",_=>return Err(ToolError::Denied)};
        let user=&self.users[actor];
        if self.revoked.contains(actor)||!user.accounts.contains(&account)||((workflow==Workflow::RefundExecute||workflow==Workflow::Notifications)&&!user.write){return Err(ToolError::Denied);}
        if key.is_empty()||key.len()>64||!key.bytes().all(|byte|byte.is_ascii_alphanumeric()||b"-_".contains(&byte)){return Err(ToolError::Arguments);}
        let request_id=if request_id.len()<=128&&request_id.bytes().all(|byte|byte.is_ascii_alphanumeric()||b"-_".contains(&byte)){request_id}else{"invalid-request-id"};
        Ok(Context {actor:actor.into(),tenant:user.tenant.into(),account:account.into(),workflow,key:key.into(),revision:self.revision,deadline:self.now+100,remaining:8,request_id:request_id.into()})
    }
    fn authorized(&self,context:&Context)->bool {
        !self.revoked.contains(&context.actor)&&context.revision==self.revision&&self.users.get(context.actor.as_str()).is_some_and(|user|user.tenant==context.tenant&&user.accounts.contains(&context.account.as_str()))
    }
    pub fn revoke(&mut self,actor:&str){self.revoked.insert(actor.into());self.revision+=1;}
    pub fn advance(&mut self,ticks:u64){self.now+=ticks;}
    fn target_exists(&self,context:&Context,call:&Call)->bool { match call {Call::ReadInvoice{record_id}|Call::PreviewRefund{record_id,..}|Call::ExecuteRefund{record_id,..}=>self.records.contains_key(&(context.account.clone(),record_id.clone())),_=>true} }
    pub fn approve(&mut self,context:&Context,call:Call)->Result<(),ToolError> {
        if !self.authorized(context)||!self.users[context.actor.as_str()].write||!offered_tools(context.workflow).contains(&call.name())||!call.valid()||!call.writes()||!self.target_exists(context,&call){return Err(ToolError::Denied);}
        self.approvals.insert(context.identity(),Approval{actor:context.actor.clone(),tenant:context.tenant.clone(),account:context.account.clone(),workflow:context.workflow,call,revision:self.revision,expires:self.now+5});Ok(())
    }
    pub fn invalid(&mut self,context:&Context){self.log(context,"unknown","denied","not_started");}
    fn log(&mut self,context:&Context,tool:&'static str,decision:&'static str,outcome:&'static str) {
        self.audit.push(Audit {operation_id:context.key.clone(),actor_reference:context.actor.clone(),tool_name:tool,policy_version:self.revision,decision,outcome,request_id:context.request_id.clone()});
    }
    pub fn execute(&mut self,context:&mut Context,call:Call)->Result<Output,ToolError> {
        let result=self.execute_inner(context,&call);
        let (decision,outcome)=match &result {Ok(_)=>("allowed","completed"),Err(ToolError::Unresolved)=>("allowed","unresolved"),Err(ToolError::Transport|ToolError::NotFound|ToolError::OutputTooLarge)=>("allowed","failed"),Err(_)=>("denied","not_started")};
        self.log(context,call.name(),decision,outcome);result
    }
    fn execute_inner(&mut self,context:&mut Context,call:&Call)->Result<Output,ToolError> {
        if context.remaining==0||self.now>=context.deadline{return Err(ToolError::Budget);}context.remaining-=1;
        if !self.authorized(context)||!offered_tools(context.workflow).contains(&call.name()){return Err(ToolError::Denied);}
        if !call.valid(){return Err(ToolError::Arguments);}
        if !self.target_exists(context,call){return Err(ToolError::NotFound);}
        if call.writes() {
            if !self.users[context.actor.as_str()].write{return Err(ToolError::Denied);}
            if let Some(receipt)=self.receipts.get(&context.identity()) {
                if receipt.call!=*call{return Err(ToolError::Conflict);}return if receipt.unresolved{Err(ToolError::Unresolved)}else{Ok(Output::Done)};
            }
            let approval=self.approvals.get(&context.identity()).ok_or(ToolError::Approval)?;
            if approval.expires<=self.now{return Err(ToolError::Expired);}
            if approval.actor!=context.actor||approval.tenant!=context.tenant||approval.account!=context.account||approval.workflow!=context.workflow||approval.revision!=self.revision||approval.call!=*call{return Err(ToolError::Approval);}
        }
        let credential=match context.account.as_str(){"account-a"=>"credential-ref-a","account-b"=>"credential-ref-b",_=>return Err(ToolError::Denied)};
        self.credential_uses.push(credential.into());
        if self.failure_detail.is_some(){return Err(ToolError::Transport);}
        match call {
            Call::FindInvoice{query,page_size}=>{
                let rows=self.records.iter().filter(|((account,_),value)|account==&context.account&&value.contains(query)).map(|((_,id),_)|id.clone()).take(*page_size as usize).collect::<Vec<_>>();Ok(Output::Rows(rows))
            }
            Call::ReadInvoice{record_id}|Call::PreviewRefund{record_id,..}=>{let value=self.records.get(&(context.account.clone(),record_id.clone())).ok_or(ToolError::NotFound)?;if value.len()>128{return Err(ToolError::OutputTooLarge);}Ok(Output::Value(value.clone()))},
            Call::ExecuteRefund{..}|Call::SendMail{..}=>{
                if let Call::SendMail{recipient,subject,body}=call {self.mail.send(Mail{recipient:recipient.clone(),subject:subject.clone(),body:body.clone()}).map_err(|_|ToolError::Arguments)?;}
                self.effects.push(Effect{tenant:context.tenant.clone(),account:context.account.clone(),key:context.key.clone(),tool:call.name(),credential_reference:credential.into()});
                self.receipts.insert(context.identity(),Receipt{call:call.clone(),unresolved:self.fail_after_effect});
                if self.fail_after_effect{Err(ToolError::Unresolved)}else{Ok(Output::Done)}
            }
        }
    }
    #[cfg(test)]
    pub fn missing_guard_variant(&mut self,context:&Context,call:&Call){self.effects.push(Effect{tenant:context.tenant.clone(),account:context.account.clone(),key:context.key.clone(),tool:call.name(),credential_reference:"incorrect-privileged-default".into()});}
}
