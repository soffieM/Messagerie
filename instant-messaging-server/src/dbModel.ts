import { MongoClient, Db} from 'mongodb';
const bcrypt = require('bcrypt');
const SALT_WORK_FACTOR = 10;

export class DbModel {
    
    database: Db = null;
    public constructor() {
        MongoClient
            .connect("mongodb://localhost:27017")
            .then( (db: Db) => this.database = db.db('dbMessagerie') )
            .catch( (reason) => console.log(reason) );
    }
    
    async addUser(username: string, password: string, mail: string): Promise<void> {
        const i = await this.getCountersIdwithIncrementation('idIncrementUser');
        const hash = await this.hashPassword(password);
        await this.database.collection('users')
        .insertOne({_id:i[0].sequence_value, username: username, password: hash, mail: mail,
                contacts:[1,2], invitations:[], id_discussion:[] }); // attention TEST sur contact
    }

    async addContactsInUsersCollection (usernameSender: string, usernameReceiver: string): Promise<void> {
        const iDSender = await this.getUserId(usernameSender);
        const iDReceiver = await this.getUserId(usernameReceiver);
        await this.database.collection('users')
        .update({_id : iDSender}, {$push: {contacts:{idUser: iDReceiver}}});
    }

    async addContact (usernameSender: string): Promise<void> {
        const iDSender = await this.getUserId(usernameSender);
        await this.database.collection('users')
        .update({_id : iDSender}, {$push: {contacts:{idUser: 'toutou'}}});
    }

    async addInvitationsInUsersCollection (usernameSender: string, usernameReceiver: string): Promise<void> {
        const iDSender = await this.getUserId(usernameSender);
        const iDReceiver = await this.getUserId(usernameReceiver);
        await this.database.collection('users')
        .update({_id : iDSender}, {$push: {invitations:{idUser: iDReceiver}}});
    }

    async addDiscussionIdToUser(username: string, id_discussion: number): Promise<void> {
        const id = await this.getUserId(username);
        await this.database.collection('users')
        .update({_id : id}, {$push: {id_discussion:{id: id_discussion}}});
    }

    async getContactUser (username: string): Promise<any> {
        const contact =  await this.database.collection('users').find({username:username}).toArray();
        return contact[0].contacts;
        /*
            On pourra récupérer la liste des contacts ou des invitations dans le client soit avec :

            const d = await this.db.getContactUser (username);
            d.forEach(element => {
                console.log("users = "+ element.idUser);
            });

            ou:

            for (let i = 0; i < d.length; i++ ){
                console.log("users = "+ d[i].idUser);
        */
    }

    async getInvitationUser (username: string): Promise<any> {
        const contact =  await this.database.collection('users').find({username:username}).toArray();
        return contact[0].invitations;
    }

    async getUserId (username: string): Promise<string>{
        const iD = await this.database.collection('users').find({username:username}).toArray();
        return iD[0]._id;
    }

    async createDiscussion(usernameSender: string, usernameReceiver: string): Promise<string> {
        const iDSender = await this.getUserId(usernameSender);
        console.log('iDSender'+ iDSender);
        const iDReceiver = await this.getUserId(usernameReceiver);
        console.log('iDReceiver'+ iDReceiver);
        const id_discussion = await this.getCountersIdwithIncrementation('idIncrementDiscussion');
        console.log('id_discussion' +id_discussion +'jusque là ça va');
        await this.database.collection('Discussions')
        .insertOne({_id:id_discussion[0].sequence_value, users:[iDSender, iDReceiver], history:[]});    
        await this.addDiscussionIdToUser(iDSender, id_discussion);
        await this.addDiscussionIdToUser(iDReceiver, id_discussion);
        return id_discussion;
    }

    async addMessageInHistory(id_discussion: string, content: string, author: string, date: Date): Promise<void> {
        await this.database.collection('Discussions').update({_id : id_discussion}, {$push: {history:{content: content, author: author, date: date}}});
    }

    async getParticipants (id_discussion): Promise <any> {
        const discussion = await this.database.collection('Discussions').find({_id: id_discussion}).toArray();
        return discussion[0].users;
    }

    async getHistory (id_discussion): Promise <any> {
        const discussion = await this.database.collection('Discussions').find({_id: id_discussion}).toArray();
        return discussion[0].history;
    }

    async checkIfUserExists(username: string): Promise<any> {
        return await this.database.collection('users').find({username:username}).count();
    }

    async checkIfMailExists(mail: string): Promise<any> {
        return await this.database.collection('users').find({mail: mail}).count();
    }

    async hashPassword (password): Promise <any> {
        return await bcrypt.hash(password, SALT_WORK_FACTOR);
    }

    async checkIfPasswordMatches (username: string): Promise <any> {
        return await this.database.collection('users').find({username:username}).toArray();
    }
    
    async verifyPasswordWithHashCode (username, password): Promise <any> {
        const i = await this.checkIfPasswordMatches(username);
        const hash = i[0].password;
        return await bcrypt.compare(password, hash);
    }

    async createCountersUser(): Promise<void> {
        await this.database.collection('idIncrementUser').insertOne({_id:"tid",sequence_value:0});
    }

    async createCountersDiscussion(): Promise<void> {
        await this.database.collection('idIncrementDiscussion').insertOne({_id:"tid",sequence_value:0});

    }

    async getCountersIdwithOutIncrementation(collection: string): Promise <any> {
        return await this.database.collection(collection).find().toArray();       
    }
    async getCountersIdwithIncrementation(collection: string): Promise <any> {
        try{
            await this.updateId(collection);
            return await this.database.collection(collection).find().toArray();
        }catch (e){
            console.log('error: '+e);
        }
    }
    async updateId(collection: string): Promise <void>{
        try{
        await this.database.collection(collection).updateOne(
            {_id: "tid"},
            { $inc: { sequence_value: 1 } },
            true
        );
        }catch (e){
            console.log('error'+e);
        }
    }

    /*
    async addMessage(content: string, author: string, date: Date): Promise<void> {
        await this.database.collection('messages').insertOne({ content: content, author: author, date: date });
    }

    
    async message(): Promise <string[]> {
      return this.database.collection('messages').find().toArray();
    }

    */
    
}