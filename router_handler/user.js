
//导入数据库操作模块
const db = require('../db/index');
//导入密码加密模块
const bcrypt = require('bcryptjs');
// 用这个包来生成 Token 字符串
const jwt = require('jsonwebtoken');
const config = require('../config');

// 注册用户的处理函数
exports.regUser = (req, res) => {

    // 接收表单数据
    const userinfo = req.body
    /*  // 判断用户名和密码是否为空
     if (!userinfo.username || !userinfo.password) {
         return res.send({ status: 1, message: '用户名或密码不能为空！' })
     } */

    // 定义 SQL 语句
    const sql = `select * from ev_users where username=?`
    // 执行 SQL 语句并根据结果判断用户名是否被占用
    db.query(sql, [userinfo.username], function (err, results) {
        // 执行 SQL 语句失败
        if (err) {
            return res.send({ status: 1, message: err.message })
        }

        // 用户名被占用
        if (results.length > 0) {
            return res.send({ status: 1, message: '用户名被占用，请更换其他用户名！' })
        }

        // 用户名可用，对用户的密码进行加密处理
        userinfo.password = bcrypt.hashSync(userinfo.password, 10);

        //插入新用户
        const sql = `insert into ev_users set ?`;
        db.query(sql, { username: userinfo.username, password: userinfo.password }, (err, results) => {
            // 执行 SQL 语句失败
            if (err) return res.send({ status: 1, message: err.message });
            // SQL 语句执行成功，但影响行数不为 1
            if (results.affectedRows !== 1) {
                return res.send({ status: 1, message: '注册用户失败，请稍后再试！' });
            }
            // 注册成功
            res.send({ status: 0, message: '注册成功！' })
        });
    })

}

// 登录的处理函数
exports.login = (req, res) => {
    // 根据用户名查询用户的数据
    const userinfo = req.body;
    const sql = `select * from ev_users where username = ?`
    db.query(sql, userinfo.username, (err, results) => {
        // 执行 SQL 语句失败
        if (err) return res.cc(err)
        // 执行 SQL 语句成功，但是查询到数据条数不等于 1
        if (results.length !== 1) return res.cc('登录失败！')

        // 拿着用户输入的密码,和数据库中存储的密码进行对比
        const compareResult = bcrypt.compareSync(userinfo.password, results[0].password)

        // 如果对比的结果等于 false, 则证明用户输入的密码错误
        if (!compareResult) {
            return res.cc('登录失败！')
        }

        // 登录成功，生成 Token 字符串
        // 快速剔除 密码 和 头像 的值，user 中只保留了用户的 id, username, nickname, email 这四个属性的值
        const user = { ...results[0], password: '', user_pic: '' }
        // 生成 Token 字符串
        const tokenStr = jwt.sign(user, config.jwtSecretKey, {
            expiresIn: '10h', // token 有效期为 10 个小时
        })
        // 将生成的 Token 字符串响应给客户端
        res.send({
            status: 0,
            message: '登录成功！',
            // 为了方便客户端使用 Token，在服务器端直接拼接上 Bearer 的前缀
            token: 'Bearer ' + tokenStr
        })

    })
}