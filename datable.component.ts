import { Component, OnInit, AfterViewInit, OnDestroy, ViewChild, Renderer2, Input } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Response } from '@angular/http';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import 'rxjs/add/operator/map';
import { DataTableDirective } from 'angular-datatables';
import { Company, Contact } from "../../interface/interface"

class DataTablesResponse {
  data: any[];
  draw: number;
  recordsFiltered: number;
  recordsTotal: number;
}
interface formObject {
  [key: string]: any
}
@Component({
  selector: 'app-datatables',
  templateUrl: './datatables.component.html',
  styleUrls: ['./datatables.component.css']
})
export class DatatablesComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input() database: string;
  @Input() interface: string;
  @ViewChild(DataTableDirective, {static: false})
  data;
  action;
  dtElement: DataTableDirective;
  dtOptions: DataTables.Settings = {};
  dtTrigger: Subject<any> = new Subject();
  showForm: boolean = false;
  formControls: formObject = {}
  formInputArr = [];
  colArr = [];
  form = new FormGroup(this.formControls);

  constructor(private http: HttpClient, private renderer: Renderer2) { }

  ngOnInit(): void {
    this.generateInput()
    this.onGenerateTable()
  }

  ngAfterViewInit(): void {
    this.dtTrigger.next();
    this.renderer.listen('document', 'click', (event) => {
    
      if (event.target.hasAttribute("data-id")) {
        if (event.target.getAttribute("data-action") == "edit") {
          this.action = "Edit";
          this.showForm = true;
          this.http.get<any>("http://localhost:4000/api/"+ this.database +"/" + event.target.getAttribute("data-id")).subscribe(res => {
          delete res.inserted_at;
          delete res.updated_at;
          console.log(res)
          let patchvalue = {};
          let doublePrices = Object.entries(res).map(([key, value]) => {
            patchvalue[key] = value;
          })
          console.log(doublePrices)
          this.form.patchValue(patchvalue)


          })
        } else {
          this.http.delete("http://localhost:4000/api/"+ this.database +"/" + event.target.getAttribute("data-id")).subscribe(res => {
            this.rerender()
          })
        }
      }
    });
  }

  ngOnDestroy(): void {
    this.dtTrigger.unsubscribe();
  }
  logKeyValuePairs(group: FormGroup): void {
    Object.keys(group.controls).forEach((key: string) => {
      const abstractControl = group.get(key);
      if (abstractControl instanceof FormGroup) {
        this.logKeyValuePairs(abstractControl)
      } else {
      }
    })
  }
  onShowForm() {
    this.form.reset()
    this.action = "New";
    this.showForm = true;
  }
  rerender(): void {
    this.dtElement.dtInstance.then((dtInstance: DataTables.Api) => {
      dtInstance.destroy();
      this.dtTrigger.next();
    });
  }
  generateInput() {
    this.http.post("http://localhost:4000/api/webhook", { scope: "gen_input", module: this.interface }).subscribe(res => {
      this.formControls["id"] = new FormControl("")
      for (let i in Object.values(res)) {
        if (res[i] != "inserted_at" && res[i] != "updated_at" && res[i] != "id") {
          this.colArr.push(Object.values(res)[i])
      }
    }
      for (let i in res) {
        if (res[i] != "inserted_at" && res[i] != "updated_at" && res[i] != "id") {
        let input = res[i]
        if (input == "domain_name"){
          this.formInputArr.push([res[i], "url"])
          this.formControls[input] = new FormControl("", [Validators.pattern("https?://.+")])
        } else if (input == "email"){
        this.formInputArr.push([res[i], "email"])
          this.formControls[input] = new FormControl("", [Validators.required, Validators.pattern("^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,4}$")])
        }else if (input == "phone_no"){
          this.formInputArr.push([res[i], "tel"])
          this.formControls[input] = new FormControl("", [Validators.required, Validators.pattern("^[0-9]+$")])
        } else {
        this.formInputArr.push([res[i], "text"])
          this.formControls[input] = new FormControl("", [Validators.required])
        }
      }
    }
    this.logKeyValuePairs(this.form)
  })
}

  onSubmit() {
    let value = this.form.value
    if (value.id == null) {
      this.http.post("http://localhost:4000/api/" + this.database, {company: value}).subscribe(res => {
        this.rerender()
        this.form.reset()
      })
    } else {
      this.http.put("http://localhost:4000/api/" + this.database + "/" + this.form.value.id , {company: value}).subscribe(res => {
        this.rerender()
        this.form.reset()
      })
    }
  }

  onGenerateTable () {
    let columns = []
    if (this.interface == "Contact") {
      columns = [{title: "name", data: "name", defaultContent: "" },{title: "email", data:"email", defaultContent: "" },{title: "phone_no", data: "phone_no", defaultContent: "" },{title: "Action",render: function (data: any, type: any, full: any) {
        return `<a href="javascript:void(0)" class="btn btn-link btn-info btn-just-icon " ><i data-id="${full.id}" data-action="edit" class="material-icons">dvr</i></a>
        <a href="javascript:void(0)" class="btn btn-link btn-danger btn-just-icon "><i data-id="${full.id}" data-action="delete" class="material-icons">close</i></a>
        `;
        }
      }]
    } else {
      columns = [{title: "name", data: "name", defaultContent: "" },{title: "email", data:"email", defaultContent: "" },{title: "domain_name", data: "domain_name", defaultContent: "" },{title: "Action",render: function (data: any, type: any, full: any) {
        return `<a href="javascript:void(0)" class="btn btn-link btn-info btn-just-icon " ><i data-id="${full.id}" data-action="edit" class="material-icons">dvr</i></a>
        <a href="javascript:void(0)" class="btn btn-link btn-danger btn-just-icon "><i data-id="${full.id}" data-action="delete" class="material-icons">close</i></a>
        `;
        }
      }]
    }
    const that = this
    this.dtOptions = {
      pagingType: 'full_numbers',
      pageLength: 10,
      serverSide: true,
      processing: true,
      responsive: true,
      ajax: (dataTablesParameters: any, callback) => {
        that.http
          .post<DataTablesResponse>(
            'http://localhost:4000/api/table' + this.database,
            dataTablesParameters, {}
          ).subscribe(resp => {
            console.log(resp)
            that.data = resp.data;

            callback({
              recordsTotal: resp.recordsTotal,
              recordsFiltered: resp.recordsFiltered,
              data: resp.data
            });
          });
      },
      columns: columns
    };
  }

}
