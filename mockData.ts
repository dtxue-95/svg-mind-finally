import type { RawNode } from './types';

export const mockInitialData: RawNode = {
    "id": 283,
    "uuid":"99eebc90456741789ee8dae41d3f6359",
    "name": "采购平台V2.3.5冒烟测试",
    "nodeType": "rootNode",
    "hasRemark": false,
    "hasScore": false,
    "reviewStatusCode": "pending_review",
    "reviewStatusName": "待评审",
    "childNodeList": [
        {
            "id": 510,
            "uuid":"2ccbc90456741789ee8dae41u5dsa3444",
            "name": "采购项目管理",
            "generateModeName":"人工",
            "nodeType": "moduleNode",
            "hasRemark": false,
            "hasScore": false,
            "reviewStatusCode": "pending_review",
            "reviewStatusName": "待评审",
            "childNodeList": [
                {
                    "id": 736,
                    "parentId": 510,
                    "uuid":"2ccbc90456741789ee8dae41u5dsa3447",
                    "name": "采购公告",
                    "nodeType": "testPointNode",
                    "generateModeName":"AI",
                    "reviewStatusCode": "pending_review",
                    "reviewStatusName": "待评审",
                    "childNodeList": [{
                        "id": 2164,
                        "parentId": 736,
                        "uuid":"768bc90456741789ee8dae41u5dsa3447",
                        "name": "验证采购公告栏的可见性与内容准确性",
                        "nodeType": "caseNode",
                        "priorityLevel":"1",
                        "hasRemark": true,
                        "hasScore": true,
                        "RemarkHistory":[{
                            "id": 2,
                            "remarker": {
                                empId: 12312,
                                realName:"李四",
                                showName: "李四"
                            },
                            "createTime": "2025-10-14 10:15:10",
                            "content": "这是备注内容"
                        },
                            {
                            "id": 1,
                            "remarker": {
                                empId: 12345,
                                realName:"张三",
                                showName: "张三"
                            },
                            "createTime": "2025-10-14 10:10:10",
                            "content": "这是很长的备注哈哈哈哈哈"
                        }],
                        "scoreInfo": {
                          "scoreName": "优秀",
                          "scoreCode": "EXCELLENT",
                          "scoreValue": 5,
                          "remark": "覆盖了核心场景",
                          "id": 1
                        },
                        "reviewStatusCode": "pending_review",
                        "reviewStatusName": "待评审",
                        "functionTestCaseDTO":{
                            "testCaseName":"成功导入接口数据",
                            "testCaseType":"1",
                            "testCaseType_name":"接口用例",
                            "testCaseDesc":"成功导入接口数据",
                            "testCaseStep":"1. 点击导入按钮\n2. 选择接口文档\n3. 点击导入\n4. 查看用例列表",
                            "testCaseExpect":"1. 用例列表中显示导入的接口数据",
                            "testCasePriority":"0",
                            "testCasePriority_name":"P0",
                            "testCaseTagList":[],
                            "finalStatusName": "待执行",
                            "finalStatus": "pending_execution",
                            "executionStatus": "not_run",
                            "executionStatusName": "未运行"
                        }
                    }],
                },
                {
                    "id": 737,
                    "parentId": 510,
                    "uuid":"2ccbc90456741789ee8dae41u5dsa3448",
                    "name": "项目报名",
                    "generateModeName":"AI",
                    "nodeType": "testPointNode",
                    "reviewStatusCode": "pending_review",
                    "reviewStatusName": "待评审",
                    "childNodeList": [
                        {
                        "id": 2165,
                        "parentId": 737,
                        "uuid":"702bc90456741789ee8dae41u5dsa3447",
                        "name": "验证阿里云采购项目报名平台入口的可访问性",
                        "generateModeName":"AI",
                        "nodeType": "caseNode",
                        "priorityLevel":"2",
                        "hasRemark": false,
                        "hasScore": true,
                        "scoreInfo": {
                          "scoreName": "良好",
                          "scoreCode": "GOOD",
                          "scoreValue": 4,
                          "remark": "步骤清晰",
                          "id": 2
                        },
                        "reviewStatusCode": "approved",
                        "reviewStatusName": "通过",
                        "functionTestCaseDTO":{
                            "finalStatus": "passed",
                             "executionStatus": "not_run"
                        }
                    }
                    ],
                },
                {
                    "id": 738,
                    "parentId": 510,
                    "uuid":"2ccbc90456741789ee8dae41u5dsa3449",
                    "name": "首页布局",
                    "generateModeName":"AI",
                    "nodeType": "testPointNode",
                    "reviewStatusCode": "pending_review",
                    "reviewStatusName": "待评审",
                    "childNodeList": [{
                        "id": 2166,
                        "parentId": 738,
                        "uuid": "802bc90456741789ee8dae41u5dsa3448",
                        "name": "验证首页元素布局与品牌一致性",
                        "nodeType": "caseNode",
                        "priorityLevel": "3",
                        "hasRemark": true,
                        "hasScore": false,
                        "reviewStatusCode": "rejected",
                        "reviewStatusName": "未通过",
                        "functionTestCaseDTO": {
                            "finalStatus": "blocked"
                        }
                    }],
                }
            ],
        },
        {
            "id": 511,
            "uuid":"2ccbc90456741789ee8dae41u5dsa3445",
            "name": "供应商管理",
            "generateModeName":"AI",
            "nodeType": "moduleNode",
            "hasRemark": false,
            "hasScore": false,
            "reviewStatusCode": "pending_review",
            "reviewStatusName": "待评审",
            "childNodeList": [
                {
                    "id": 739,
                    "parentId": 511,
                    "uuid":"2ccbc90456741789ee8dae41u5dsa1765",
                    "name": "首页布局1",
                    "generateModeName":"AI",
                    "nodeType": "testPointNode",
                    "hasRemark": true,
                    "hasScore": false,
                    "reviewStatusCode": "pending_review",
                    "reviewStatusName": "待评审",
                    "childNodeList": [],
                }
            ],
        },
        {
            "id": 512,
            "uuid":"2ccbc90456741789ee8dae41u5dsa3446",
            "name": "合同管理",
            "generateModeName":"AI",
            "nodeType": "moduleNode",
            "hasRemark": false,
            "hasScore": false,
            "reviewStatusCode": "pending_review",
            "reviewStatusName": "待评审",
            "childNodeList": [],
        }
    ]
};