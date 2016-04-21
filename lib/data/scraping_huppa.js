var i;
var j;

var resKM = {};
var resME = {};
var resNK = {};
var resEK = {};

var inner = {};

var title;
var value;
var parent;



var me = $('.browser_table').get(0);
var nk = $('.browser_table').get(1);
var ek = $('.browser_table').get(2);




var km = $('.left');
var firstL = km.first().find('.entryLabel');
var firstV = km.first().find('.entryValue');
for(i=0; i<firstL.length; i++){
	var title = firstL[i].innerText;
	var value = firstV[i].innerText;
	resKM[title] = value;
}

var secondL = $(km.get(1)).find('.entryLabel');
var secondV = $(km.get(1)).find('.entryValue');
for(i=0; i<secondL.length; i++){
	var title = secondL[i].innerText;
	var value = secondV[i].innerText;
	resKM[title] = value;
}


var titleEl = $(me).find('td');
// one iteration-> output: {title:{1:value,2:value,3:value}}
for(i=0; i<titleEl.length;i=i+4){
	title = titleEl[i].innerText;

	for(j=i+1; j<i+4; j++){
		var newTitle = title+" "+(j-i);
		resME[newTitle]= titleEl[j].innerText;
		//inner[j-i] =  titleEl[j].innerText;
	}
	//resME[title] = inner;
	//inner = {};
}


titleEl = $(nk).find('.first');
for(i=0; i<titleEl.length; i++){
	parent = $(titleEl[i]).parent();
	title = $(parent).find('.first').get(0).innerText;
	value = $(parent).find('.last').get(0).innerText;
	resNK[title] = value;
}


titleEl = $(ek).find('.first');
for(i=0; i<titleEl.length; i++){
	parent = $(titleEl[i]).parent();
	title = $(parent).find('.first').get(0).innerText;
	value = $(parent).find('.last').get(0).innerText;
	resEK[title] = value;
}

console.log("\"nr\":"+"{\n\"KM\":"+JSON.stringify(resKM)+
			",\n\"ME\":"+JSON.stringify(resME)+
			",\n\"NK\":"+JSON.stringify(resNK)+
			",\n\"EK\":"+JSON.stringify(resEK)+'},');
