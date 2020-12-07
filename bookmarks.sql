drop table if exists bookmarks;

create table bookmarks(
    id INTEGER primary key generated by default as identity,
    title text,
    link url,
    descript text
);

insert into bookmarks (title, link, descript)
values
    ('Thinkful', 'http://www.thinkful.com', 'description'),
    ('Heroku', 'http://www.heroku.com', 'description'),
    ('Vercel', 'http://www.Vercel.com', 'description'),
    ('Thinkful', 'http://www.thinkful.com', 'description'),
    ('Thinkful', 'http://www.thinkful.com', 'description'),
    ('Thinkful', 'http://www.thinkful.com', 'description'),
    ('Thinkful', 'http://www.thinkful.com', 'description'),
    ('Thinkful', 'http://www.thinkful.com', 'description'),
    ('Thinkful', 'http://www.thinkful.com', 'description'),
    ('Thinkful', 'http://www.thinkful.com', 'description');